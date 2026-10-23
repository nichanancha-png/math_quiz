import { ExamSet, StudentSubmission } from '../types';

export const api = {
  // Fetch exams (teacher gets all, student gets only published)
  async getExams(role: 'teacher' | 'student' = 'student'): Promise<ExamSet[]> {
    const url = `/api/exams?role=${role}${role === 'teacher' ? '&include_hidden=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`โหลดชุดข้อสอบไม่สำเร็จ: ${res.statusText}`);
    }
    return res.json();
  },

  // Get specific exam
  async getExam(id: string): Promise<ExamSet> {
    const res = await fetch(`/api/exams/${id}`);
    if (!res.ok) {
      throw new Error(`ไม่พบชุดข้อสอบ: ${res.statusText}`);
    }
    return res.json();
  },

  // Create new exam set
  async createExam(payload: Partial<ExamSet>): Promise<ExamSet> {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'สร้างชุดข้อสอบไม่สำเร็จ');
    }
    return res.json();
  },

  // Update existing exam set
  async updateExam(id: string, updates: Partial<ExamSet>): Promise<ExamSet> {
    const res = await fetch(`/api/exams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'บันทึกชุดข้อสอบไม่สำเร็จ');
    }
    return res.json();
  },

  // Toggle visibility (publish/hide)
  async togglePublish(id: string, is_published: boolean): Promise<ExamSet> {
    const res = await fetch(`/api/exams/${id}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'เปลี่ยนสถานะการเผยแพร่ไม่สำเร็จ');
    }
    return res.json();
  },

  // Duplicate exam
  async duplicateExam(id: string): Promise<ExamSet> {
    const res = await fetch(`/api/exams/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ทำสำเนาชุดข้อสอบไม่สำเร็จ');
    }
    return res.json();
  },

  // Delete exam
  async deleteExam(id: string): Promise<boolean> {
    const res = await fetch(`/api/exams/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ลบชุดข้อสอบไม่สำเร็จ');
    }
    return true;
  },

  // Fetch submissions (all or by examId)
  async getSubmissions(examId?: string): Promise<StudentSubmission[]> {
    const query = examId && examId !== 'all' ? `?exam_id=${encodeURIComponent(examId)}` : '';
    const res = await fetch(`/api/submissions${query}`);
    if (!res.ok) {
      throw new Error('ไม่สามารถโหลดผลคะแนนได้');
    }
    return res.json();
  },

  // Submit student exam result
  async submitExam(submission: StudentSubmission): Promise<StudentSubmission> {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ส่งผลคะแนนสอบไม่สำเร็จ');
    }
    return res.json();
  },

  // Clear submissions
  async clearSubmissions(examId?: string): Promise<boolean> {
    const query = examId && examId !== 'all' ? `?exam_id=${encodeURIComponent(examId)}` : '';
    const res = await fetch(`/api/submissions${query}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  // Database status
  async getDbStatus() {
    const res = await fetch('/api/db/status');
    return res.json();
  },

  // Export DB
  async exportDatabase() {
    window.open('/api/db/export', '_blank');
  },

  // Import DB
  async importDatabase(jsonData: any): Promise<boolean> {
    const res = await fetch('/api/db/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'นำเข้าข้อมูลไม่สำเร็จ');
    }
    return true;
  },

  // Test PostgreSQL connection
  async testPostgres(config: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/test-pg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },
};
