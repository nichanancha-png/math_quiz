import fs from 'fs';
import path from 'path';
import { ExamSet, Question, StudentSubmission } from '../types.ts';
import { initialQuestions, initialSubmissions } from '../data/initialQuiz.ts';
import pg from 'pg';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mathquiz_db.json');

export interface DatabaseState {
  exams: ExamSet[];
  submissions: StudentSubmission[];
  lastUpdated: string;
}

const defaultExams: ExamSet[] = [
  {
    id: 'exam-1',
    title: 'แบบทดสอบวิชาคณิตศาสตร์ ชุดที่ 1 (พื้นฐานและความเข้าใจ)',
    description: 'ข้อสอบคณิตศาสตร์ ม.ปลาย ครอบคลุม เลขยกกำลัง, พีชคณิต, ตรีโกณมิติ, เรขาคณิต, และความน่าจะเป็น',
    time_limit_minutes: 15,
    is_published: true, // นักเรียนมองเห็นและทำได้
    created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
    questions: initialQuestions,
  },
  {
    id: 'exam-2',
    title: 'แบบทดสอบวิชาคณิตศาสตร์ ชุดที่ 2 (การประยุกต์และโจทย์ปัญหา)',
    description: 'ชุดข้อสอบเน้นการคำนวณขั้นสูง เมทริกซ์ ลำดับและอนุกรม แคลคูลัสเบื้องต้น',
    time_limit_minutes: 20,
    is_published: false, // แบบร่าง ครูยังไม่เผยแพร่ (สามารถเปิดได้)
    created_at: new Date('2026-10-22T09:30:00Z').toISOString(),
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 1,
        topic: 'ลำดับและอนุกรม',
        question: 'ผลบวก 10 พจน์แรกของลำดับเลขคณิต $3, 7, 11, 15, \\dots$ มีค่าเท่ากับเท่าใด',
        choices: ['$210$', '$190$', '$230$', '$180$'],
        correct_answer_index: 0,
        explanation: 'สูตรผลบวกอนุกรมเลขคณิต $S_n = \\frac{n}{2}(2a_1 + (n-1)d)$ โดย $a_1 = 3, d = 4, n = 10$ จะได้ $S_{10} = 5(6 + 36) = 5(42) = 210$',
      },
      {
        id: 2,
        topic: 'แคลคูลัส',
        question: 'อนุพันธ์ของฟังก์ชัน $f(x) = 3x^3 - 4x^2 + 5x - 7$ ที่จุด $x = 1$ มีค่าเท่ากับเท่าใด',
        choices: ['$6$', '$5$', '$9$', '$10$'],
        correct_answer_index: 0,
        explanation: '$f\'(x) = 9x^2 - 8x + 5$ แทน $x = 1$ จะได้ $f\'(1) = 9(1) - 8(1) + 5 = 6$',
      },
      {
        id: 3,
        topic: 'เมทริกซ์',
        question: 'กำหนดเมทริกซ์ $A = \\begin{bmatrix} 2 & 1 \\\\ 4 & 3 \\end{bmatrix}$ จงหาดีเทอร์มิแนนต์ $\\det(A)$',
        choices: ['$2$', '$10$', '$6$', '$-2$'],
        correct_answer_index: 0,
        explanation: '$\\det(A) = (2)(3) - (1)(4) = 6 - 4 = 2$',
      },
    ],
  },
];

// Initialize mapped initial submissions with exam_id
const defaultSubmissions: StudentSubmission[] = initialSubmissions.map((sub) => ({
  ...sub,
  exam_id: 'exam-1',
  exam_title: 'แบบทดสอบวิชาคณิตศาสตร์ ชุดที่ 1 (พื้นฐานและความเข้าใจ)',
}));

class MathQuizDatabase {
  private state: DatabaseState = {
    exams: [],
    submissions: [],
    lastUpdated: new Date().toISOString(),
  };

  private pgPool: pg.Pool | null = null;

  constructor() {
    this.ensureDirectory();
    this.loadFromFile();
    this.initPostgresIfConfigured();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.exams && Array.isArray(parsed.exams) && parsed.exams.length > 0) {
          this.state = parsed;
          console.log(`[Database] Loaded ${this.state.exams.length} exams and ${this.state.submissions.length} submissions from disk.`);
          return;
        }
      }
    } catch (err) {
      console.error('[Database] Failed to read database file, seeding defaults:', err);
    }

    // Populate with defaults
    this.state = {
      exams: defaultExams,
      submissions: defaultSubmissions,
      lastUpdated: new Date().toISOString(),
    };
    this.saveToFile();
    console.log('[Database] Seeded initial database with default exams and submissions.');
  }

  public saveToFile() {
    try {
      this.state.lastUpdated = new Date().toISOString();
      // Atomic write: write to temp file then rename
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[Database] Error saving database to file:', err);
      try {
        // Direct write fallback
        fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
      } catch (e) {
        console.error('[Database] Direct write failed:', e);
      }
    }
  }

  private async initPostgresIfConfigured() {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.PGHOST;
    if (connectionString || host) {
      try {
        this.pgPool = new pg.Pool({
          connectionString: connectionString || undefined,
          host: host || undefined,
          port: Number(process.env.PGPORT) || 5432,
          user: process.env.PGUSER || undefined,
          password: process.env.PGPASSWORD || undefined,
          database: process.env.PGDATABASE || undefined,
          connectionTimeoutMillis: 5000,
        });

        // Test connection
        const client = await this.pgPool.connect();
        console.log('[PostgreSQL] Successfully connected to PostgreSQL database!');
        client.release();
      } catch (err) {
        console.warn('[PostgreSQL] Could not connect to external PostgreSQL, using persistent disk JSON storage.', err);
      }
    }
  }

  // --- Exam Operations ---

  public getExams(includeHidden = false): ExamSet[] {
    if (includeHidden) {
      return this.state.exams;
    }
    // Student only sees published exams
    return this.state.exams.filter((exam) => exam.is_published === true);
  }

  public getExamById(id: string): ExamSet | null {
    return this.state.exams.find((e) => e.id === id) || null;
  }

  public createExam(payload: Partial<ExamSet>): ExamSet {
    const id = payload.id || `exam-${Date.now()}`;
    const newExam: ExamSet = {
      id,
      title: payload.title || 'ชุดข้อสอบใหม่',
      description: payload.description || '',
      time_limit_minutes: payload.time_limit_minutes || 15,
      is_published: payload.is_published ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      questions: payload.questions || [],
    };

    this.state.exams.push(newExam);
    this.saveToFile();
    return newExam;
  }

  public updateExam(id: string, updates: Partial<ExamSet>): ExamSet | null {
    const index = this.state.exams.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = this.state.exams[index];
    const updated: ExamSet = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
      updated_at: new Date().toISOString(),
    };

    this.state.exams[index] = updated;
    this.saveToFile();
    return updated;
  }

  public toggleExamPublish(id: string, is_published: boolean): ExamSet | null {
    return this.updateExam(id, { is_published });
  }

  public duplicateExam(id: string): ExamSet | null {
    const existing = this.getExamById(id);
    if (!existing) return null;

    const duplicated: ExamSet = {
      ...existing,
      id: `exam-${Date.now()}`,
      title: `${existing.title} (สำเนา)`,
      is_published: false, // Default duplicated as draft
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      questions: JSON.parse(JSON.stringify(existing.questions)),
    };

    this.state.exams.push(duplicated);
    this.saveToFile();
    return duplicated;
  }

  public deleteExam(id: string): boolean {
    const initialLen = this.state.exams.length;
    this.state.exams = this.state.exams.filter((e) => e.id !== id);
    if (this.state.exams.length !== initialLen) {
      this.saveToFile();
      return true;
    }
    return false;
  }

  // --- Submissions Operations ---

  public getSubmissions(examId?: string): StudentSubmission[] {
    if (!examId || examId === 'all') {
      return this.state.submissions;
    }
    return this.state.submissions.filter((sub) => sub.exam_id === examId);
  }

  public addSubmission(submission: StudentSubmission): StudentSubmission {
    const exam = submission.exam_id ? this.getExamById(submission.exam_id) : null;
    const item: StudentSubmission = {
      ...submission,
      id: submission.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      submitted_at: submission.submitted_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
      exam_title: exam ? exam.title : submission.exam_title || 'ข้อสอบทั่วไป',
    };

    this.state.submissions.unshift(item);
    this.saveToFile();
    return item;
  }

  public clearSubmissions(examId?: string): boolean {
    if (!examId || examId === 'all') {
      this.state.submissions = [];
    } else {
      this.state.submissions = this.state.submissions.filter((s) => s.exam_id !== examId);
    }
    this.saveToFile();
    return true;
  }

  // --- Backup & Restore ---

  public exportDatabase(): DatabaseState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public importDatabase(newState: Partial<DatabaseState>): boolean {
    if (newState.exams && Array.isArray(newState.exams)) {
      this.state.exams = newState.exams;
      if (newState.submissions && Array.isArray(newState.submissions)) {
        this.state.submissions = newState.submissions;
      }
      this.state.lastUpdated = new Date().toISOString();
      this.saveToFile();
      return true;
    }
    return false;
  }

  public async testPostgresConnection(config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const testPool = new pg.Pool({
        host: config.host || process.env.PGHOST || 'localhost',
        port: config.port || Number(process.env.PGPORT) || 5432,
        user: config.user || process.env.PGUSER || 'postgres',
        password: config.password || process.env.PGPASSWORD || '',
        database: config.database || process.env.PGDATABASE || 'postgres',
        connectionTimeoutMillis: 3000,
      });
      const client = await testPool.connect();
      const res = await client.query('SELECT current_database(), current_user, version()');
      client.release();
      await testPool.end();
      return {
        success: true,
        message: `เชื่อมต่อ PostgreSQL สำเร็จ! ฐานข้อมูล: ${res.rows[0].current_database}, ผู้ใช้: ${res.rows[0].current_user}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `ไม่สามารถเชื่อมต่อ PostgreSQL ได้: ${err.message}`,
      };
    }
  }
}

export const mathQuizDb = new MathQuizDatabase();
