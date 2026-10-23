/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Trophy,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Plus,
  Server,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { ExamSet, Question, StudentSubmission } from './types';
import { initialQuestions, initialSubmissions } from './data/initialQuiz';
import { calculateCentralTendency, calculateItemAnalysis } from './utils/statistics';
import { exportScoresToExcel } from './utils/excelExporter';
import { StudentExam } from './components/StudentExam';
import { TeacherDashboard } from './components/TeacherDashboard';
import { RealtimeLeaderboard } from './components/RealtimeLeaderboard';
import { api } from './utils/api';

const defaultSeedExams: ExamSet[] = [
  {
    id: 'exam-1',
    title: 'แบบทดสอบวิชาคณิตศาสตร์ ชุดที่ 1 (พื้นฐานและความเข้าใจ)',
    description: 'ข้อสอบคณิตศาสตร์ ม.ปลาย ครอบคลุม เลขยกกำลัง, พีชคณิต, ตรีโกณมิติ, เรขาคณิต, และความน่าจะเป็น',
    time_limit_minutes: 15,
    is_published: true,
    created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
    questions: initialQuestions,
  },
  {
    id: 'exam-2',
    title: 'แบบทดสอบวิชาคณิตศาสตร์ ชุดที่ 2 (การประยุกต์และโจทย์ปัญหา)',
    description: 'ชุดข้อสอบเน้นการคำนวณขั้นสูง ลำดับและอนุกรม แคลคูลัสเบื้องต้น เมทริกซ์',
    time_limit_minutes: 20,
    is_published: false,
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

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'leaderboard'>('student');

  // Exams State
  const [exams, setExams] = useState<ExamSet[]>(() => {
    try {
      const cached = localStorage.getItem('mathquiz_exams');
      if (cached) return JSON.parse(cached);
    } catch {}
    return defaultSeedExams;
  });

  const [currentExamId, setCurrentExamId] = useState<string>(() => {
    return localStorage.getItem('mathquiz_current_exam_id') || 'exam-1';
  });

  // Submissions State
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const cached = localStorage.getItem('mathquiz_submissions');
      if (cached) return JSON.parse(cached);
    } catch {}
    return initialSubmissions.map((s) => ({ ...s, exam_id: 'exam-1' }));
  });

  const [lastSubmittedStudentName, setLastSubmittedStudentName] = useState<string>('');
  const [isServerSynced, setIsServerSynced] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mathquiz_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('mathquiz_current_exam_id', currentExamId);
  }, [currentExamId]);

  useEffect(() => {
    localStorage.setItem('mathquiz_submissions', JSON.stringify(submissions));
  }, [submissions]);

  // Central Server Fetch & Sync Function
  const syncWithServer = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [serverExams, serverSubmissions] = await Promise.all([
        api.getExams('teacher'),
        api.getSubmissions(),
      ]);

      if (serverExams && Array.isArray(serverExams) && serverExams.length > 0) {
        setExams(serverExams);
        if (!currentExamId || !serverExams.some((e) => e.id === currentExamId)) {
          setCurrentExamId(serverExams[0].id);
        }
      }

      if (serverSubmissions && Array.isArray(serverSubmissions)) {
        setSubmissions(serverSubmissions);
      }

      setIsServerSynced(true);
    } catch (err) {
      console.warn('[Sync] Server sync fallback to local cache:', err);
      setIsServerSynced(false);
    } finally {
      setIsSyncing(false);
    }
  }, [currentExamId]);

  // Initial load and auto-sync polling every 4 seconds
  useEffect(() => {
    syncWithServer();
    const interval = setInterval(() => {
      syncWithServer();
    }, 4000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Current active exam object
  const currentExam = useMemo(() => {
    return exams.find((e) => e.id === currentExamId) || exams[0] || defaultSeedExams[0];
  }, [exams, currentExamId]);

  // Published exams (for students)
  const publishedExams = useMemo(() => {
    return exams.filter((e) => e.is_published);
  }, [exams]);

  // Submissions filtered for current exam
  const currentExamSubmissions = useMemo(() => {
    if (!currentExam) return [];
    return submissions.filter((s) => s.exam_id === currentExam.id || !s.exam_id);
  }, [submissions, currentExam]);

  // Derived statistics for active exam
  const stats = useMemo(() => {
    const qList = currentExam?.questions || [];
    return calculateCentralTendency(currentExamSubmissions, qList.length, qList);
  }, [currentExamSubmissions, currentExam]);

  const itemAnalysis = useMemo(() => {
    const qList = currentExam?.questions || [];
    return calculateItemAnalysis(qList, currentExamSubmissions);
  }, [currentExam, currentExamSubmissions]);

  // Handlers for Teacher Exam Operations
  const handleSelectExam = (id: string) => {
    setCurrentExamId(id);
  };

  const handleCreateExam = async (data: {
    title: string;
    description: string;
    time_limit_minutes: number;
    is_published: boolean;
  }) => {
    try {
      const created = await api.createExam({
        ...data,
        questions: [
          {
            id: 1,
            topic: 'คณิตศาสตร์ทั่วไป',
            question: 'คำถามข้อที่ 1: กำหนดให้ $x + 2 = 5$ จงหาค่าของ $x$',
            choices: ['$x = 3$', '$x = 5$', '$x = 2$', '$x = 7$'],
            correct_answer_index: 0,
            explanation: 'ย้ายข้าง $x = 5 - 2 = 3$',
          },
        ],
      });
      setExams((prev) => [...prev, created]);
      setCurrentExamId(created.id);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถสร้างชุดข้อสอบได้');
    }
  };

  const handleTogglePublish = async (id: string, is_published: boolean) => {
    // Optimistic UI update
    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_published } : e))
    );
    try {
      await api.togglePublish(id, is_published);
    } catch (err: any) {
      console.error('Failed to toggle publish on server:', err);
      syncWithServer();
    }
  };

  const handleDuplicateExam = async (id: string) => {
    try {
      const duplicated = await api.duplicateExam(id);
      setExams((prev) => [...prev, duplicated]);
      setCurrentExamId(duplicated.id);
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถคัดลอกชุดข้อสอบได้');
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await api.deleteExam(id);
      const remaining = exams.filter((e) => e.id !== id);
      setExams(remaining);
      if (remaining.length > 0) {
        setCurrentExamId(remaining[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถลบชุดข้อสอบได้');
    }
  };

  const handleUpdateQuizTitle = async (title: string) => {
    if (!currentExam) return;
    setExams((prev) =>
      prev.map((e) => (e.id === currentExam.id ? { ...e, title } : e))
    );
    try {
      await api.updateExam(currentExam.id, { title });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTimeLimit = async (min: number) => {
    if (!currentExam) return;
    setExams((prev) =>
      prev.map((e) => (e.id === currentExam.id ? { ...e, time_limit_minutes: min } : e))
    );
    try {
      await api.updateExam(currentExam.id, { time_limit_minutes: min });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuestions = async (updatedQuestions: Question[]) => {
    if (!currentExam) return;
    setExams((prev) =>
      prev.map((e) => (e.id === currentExam.id ? { ...e, questions: updatedQuestions } : e))
    );
    try {
      await api.updateExam(currentExam.id, { questions: updatedQuestions });
    } catch (err) {
      console.error(err);
    }
  };

  // Student Submission
  const handleStudentSubmission = async (newSub: StudentSubmission) => {
    const payload = {
      ...newSub,
      exam_id: currentExam?.id || 'exam-1',
      exam_title: currentExam?.title || 'แบบทดสอบคณิตศาสตร์',
    };
    // Optimistic
    setSubmissions((prev) => [payload, ...prev]);
    setLastSubmittedStudentName(payload.student_name);
    try {
      const saved = await api.submitExam(payload);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === payload.id ? saved : s))
      );
    } catch (err) {
      console.error('Submission saved locally, server sync error:', err);
    }
  };

  // Simulate Student Submission
  const handleAddSimulatedStudent = async () => {
    if (!currentExam) return;
    const randomNames = [
      'ชานนท์ สิทธิโชค (เลขที่ 05)',
      'ธัญญาเรศ รักษ์สุข (เลขที่ 09)',
      'พิชญะ ธีรพงศ์ (เลขที่ 14)',
      'ลลิตา เกษมศรี (เลขที่ 19)',
      'อภิสิทธิ์ ชัยพร (เลขที่ 25)',
      'นลินทิพย์ ภัทรดิลก (เลขที่ 28)',
      'เกียรติศักดิ์ พลอยประเสริฐ (เลขที่ 31)',
    ];
    const name = `${randomNames[Math.floor(Math.random() * randomNames.length)]} #${Math.floor(Math.random() * 100)}`;

    let score = 0;
    const answers: StudentSubmission['answers'] = {};
    const qList = currentExam.questions;

    qList.forEach((q) => {
      const isCorrect = Math.random() < 0.75;
      const chosen = isCorrect
        ? q.correct_answer_index
        : (q.correct_answer_index + 1 + Math.floor(Math.random() * 3)) % 4;

      if (isCorrect) score += 1;
      answers[String(q.id)] = {
        chosen,
        correct: q.correct_answer_index,
        is_correct: isCorrect,
        explanation: q.explanation,
        topic: q.topic,
      };
    });

    const total = qList.length;
    const percentage = total > 0 ? Math.round((score / total) * 1000) / 10 : 0;
    const timeTaken = 90 + Math.floor(Math.random() * 180);

    const newSub: StudentSubmission = {
      id: `sub-${Date.now()}`,
      exam_id: currentExam.id,
      exam_title: currentExam.title,
      student_name: name,
      score,
      total,
      percentage,
      time_taken_seconds: timeTaken,
      submitted_at: new Date().toLocaleString('th-TH'),
      answers,
    };

    handleStudentSubmission(newSub);
  };

  const handleClearSubmissions = async () => {
    if (confirm(`ต้องการล้างประวัติการส่งคำตอบของชุดข้อสอบ "${currentExam?.title}" หรือไม่?`)) {
      setSubmissions((prev) => prev.filter((s) => s.exam_id !== currentExam?.id));
      try {
        await api.clearSubmissions(currentExam?.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap justify-between items-center gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
              ∑
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  MathQuiz Pro
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ฐานข้อมูลเซิร์ฟเวอร์กลาง
                </span>
                <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
                  (เปิดสอบ {publishedExams.length}/{exams.length} ชุด)
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                ระบบสอบหลายชุด • ครูควบคุมการเผยแพร่ • บันทึกถาวรไม่หาย • ลีดเดอร์บอร์ดเรียลไทม์
              </p>
            </div>
          </div>

          {/* Role Navigation Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>ห้องสอบนักเรียน</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ห้องควบคุมครู ({exams.length} ชุด)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-amber-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>ลีดเดอร์บอร์ด ({submissions.length})</span>
            </button>
          </div>

          {/* Server Sync Indicator & Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={syncWithServer}
              disabled={isSyncing}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              title="ซิงค์ข้อมูลกับเซิร์ฟเวอร์กลาง"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์สด'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportScoresToExcel(currentExamSubmissions, currentExam.questions, stats, itemAnalysis, currentExam.title)}
              className="text-xs px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="ส่งออกคะแนนเป็นไฟล์ Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'student' && (
          <StudentExam
            quizTitle={currentExam.title}
            questions={currentExam.questions}
            timeLimitMinutes={currentExam.time_limit_minutes}
            availableExams={publishedExams}
            activeExamId={currentExam.id}
            onSelectExam={handleSelectExam}
            onSubmit={handleStudentSubmission}
            onViewLeaderboard={() => setActiveTab('leaderboard')}
            onRefreshExams={syncWithServer}
          />
        )}

        {activeTab === 'teacher' && (
          <TeacherDashboard
            exams={exams}
            currentExamId={currentExam.id}
            onSelectExam={handleSelectExam}
            onCreateExam={handleCreateExam}
            onTogglePublish={handleTogglePublish}
            onDuplicateExam={handleDuplicateExam}
            onDeleteExam={handleDeleteExam}
            quizTitle={currentExam.title}
            onUpdateQuizTitle={handleUpdateQuizTitle}
            timeLimitMinutes={currentExam.time_limit_minutes}
            onUpdateTimeLimit={handleUpdateTimeLimit}
            questions={currentExam.questions}
            onUpdateQuestions={handleUpdateQuestions}
            submissions={currentExamSubmissions}
            allSubmissions={submissions}
            onAddSimulatedStudent={handleAddSimulatedStudent}
            onClearSubmissions={handleClearSubmissions}
            stats={stats}
            itemAnalysis={itemAnalysis}
            onSwitchToLeaderboard={() => setActiveTab('leaderboard')}
          />
        )}

        {activeTab === 'leaderboard' && (
          <RealtimeLeaderboard
            submissions={submissions}
            questions={currentExam.questions}
            stats={stats}
            currentStudentName={lastSubmittedStudentName}
            exams={exams}
            selectedExamId={currentExam.id}
            onSelectExam={handleSelectExam}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>MathQuiz Pro • แพลตฟอร์มทดสอบคณิตศาสตร์พร้อม KaTeX และการวิเคราะห์ผลเชิงสถิติ</span>
          <div className="flex items-center gap-3 text-slate-500">
            <span>ชุดข้อสอบทั้งหมด {exams.length} ชุด</span>
            <span>•</span>
            <span>เปิดสอบ {publishedExams.length} ชุด</span>
            <span>•</span>
            <span>ส่งคะแนนทั้งหมด {submissions.length} คน</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
