import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { mathQuizDb } from './src/server/db.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// ----------------- API Endpoints -----------------

// 1. Get Exams
app.get('/api/exams', (req: Request, res: Response) => {
  try {
    const includeHidden = req.query.include_hidden === 'true' || req.query.role === 'teacher';
    const exams = mathQuizDb.getExams(includeHidden);
    res.json(exams);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get exams' });
  }
});

// 2. Get Single Exam
app.get('/api/exams/:id', (req: Request, res: Response) => {
  try {
    const exam = mathQuizDb.getExamById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'ไม่พบชุดข้อสอบนี้' });
    }
    res.json(exam);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create Exam
app.post('/api/exams', (req: Request, res: Response) => {
  try {
    const { title, description, time_limit_minutes, is_published, questions } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อชุดข้อสอบ' });
    }
    const created = mathQuizDb.createExam({
      title,
      description: description || '',
      time_limit_minutes: Number(time_limit_minutes) || 15,
      is_published: is_published ?? true,
      questions: Array.isArray(questions) ? questions : [],
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Exam
app.put('/api/exams/:id', (req: Request, res: Response) => {
  try {
    const updated = mathQuizDb.updateExam(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'ไม่พบชุดข้อสอบเพื่ออัปเดต' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Toggle Exam Visibility (Publish / Hide)
app.patch('/api/exams/:id/publish', (req: Request, res: Response) => {
  try {
    const { is_published } = req.body;
    if (typeof is_published !== 'boolean') {
      return res.status(400).json({ error: 'is_published ต้องเป็น boolean (true/false)' });
    }
    const updated = mathQuizDb.toggleExamPublish(req.params.id, is_published);
    if (!updated) {
      return res.status(404).json({ error: 'ไม่พบชุดข้อสอบ' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Duplicate Exam
app.post('/api/exams/:id/duplicate', (req: Request, res: Response) => {
  try {
    const duplicated = mathQuizDb.duplicateExam(req.params.id);
    if (!duplicated) {
      return res.status(404).json({ error: 'ไม่พบชุดข้อสอบเพื่อทำสำเนา' });
    }
    res.status(201).json(duplicated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete Exam
app.delete('/api/exams/:id', (req: Request, res: Response) => {
  try {
    const success = mathQuizDb.deleteExam(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'ไม่พบชุดข้อสอบเพื่อลบ' });
    }
    res.json({ success: true, message: 'ลบชุดข้อสอบเรียบร้อยแล้ว' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get Submissions
app.get('/api/submissions', (req: Request, res: Response) => {
  try {
    const examId = req.query.exam_id as string | undefined;
    const submissions = mathQuizDb.getSubmissions(examId);
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Add Submission
app.post('/api/submissions', (req: Request, res: Response) => {
  try {
    const sub = req.body;
    if (!sub || !sub.student_name) {
      return res.status(400).json({ error: 'ข้อมูลการส่งข้อสอบไม่สมบูรณ์ (ต้องมีชื่อนักเรียน)' });
    }
    const saved = mathQuizDb.addSubmission(sub);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Clear Submissions
app.delete('/api/submissions', (req: Request, res: Response) => {
  try {
    const examId = req.query.exam_id as string | undefined;
    mathQuizDb.clearSubmissions(examId);
    res.json({ success: true, message: 'ล้างข้อมูลคะแนนสอบเรียบร้อยแล้ว' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Database Status & Info
app.get('/api/db/status', (req: Request, res: Response) => {
  try {
    const exams = mathQuizDb.getExams(true);
    const submissions = mathQuizDb.getSubmissions();
    res.json({
      status: 'online',
      storage: 'Persistent Server Disk (mathquiz_db.json)',
      total_exams: exams.length,
      published_exams: exams.filter((e) => e.is_published).length,
      hidden_exams: exams.filter((e) => !e.is_published).length,
      total_submissions: submissions.length,
      server_time: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Backup Database
app.get('/api/db/export', (_req: Request, res: Response) => {
  try {
    const data = mathQuizDb.exportDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mathquiz_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Restore Database
app.post('/api/db/import', (req: Request, res: Response) => {
  try {
    const success = mathQuizDb.importDatabase(req.body);
    if (!success) {
      return res.status(400).json({ error: 'โครงสร้างไฟล์สำรองไม่ถูกต้อง' });
    }
    res.json({ success: true, message: 'กู้คืนฐานข้อมูลสำเร็จ' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Test PostgreSQL Connection (for Docker pgAdmin users)
app.post('/api/db/test-pg', async (req: Request, res: Response) => {
  try {
    const result = await mathQuizDb.testPostgresConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- Vite Dev / Static Serve -----------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production dist folder not found. Falling back to Vite dev mode.');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MathQuiz Pro] Server ready on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
