import React, { useState, useRef } from 'react';
import {
  PlusCircle,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit3,
  CheckCircle2,
  BarChart3,
  Layers,
  HelpCircle,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertCircle,
  UserPlus,
  Copy,
  Plus,
  Database,
  Server,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { CentralTendencyStats, ExamSet, ItemAnalysis, Question, StudentSubmission } from '../types';
import { MathSymbolPicker } from './MathSymbolPicker';
import { MathText } from '../utils/mathRenderer';
import { exportScoresToCsv, exportScoresToExcel } from '../utils/excelExporter';
import { TeacherQuestionPreview } from './TeacherQuestionPreview';
import { api } from '../utils/api';

interface TeacherDashboardProps {
  exams: ExamSet[];
  currentExamId: string;
  onSelectExam: (id: string) => void;
  onCreateExam: (exam: { title: string; description: string; time_limit_minutes: number; is_published: boolean }) => void;
  onTogglePublish: (id: string, is_published: boolean) => void;
  onDuplicateExam: (id: string) => void;
  onDeleteExam: (id: string) => void;
  quizTitle: string;
  onUpdateQuizTitle: (title: string) => void;
  timeLimitMinutes: number;
  onUpdateTimeLimit: (min: number) => void;
  questions: Question[];
  onUpdateQuestions: (questions: Question[]) => void;
  submissions: StudentSubmission[];
  allSubmissions?: StudentSubmission[];
  onAddSimulatedStudent: () => void;
  onClearSubmissions: () => void;
  stats: CentralTendencyStats;
  itemAnalysis: ItemAnalysis[];
  onSwitchToLeaderboard: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  exams,
  currentExamId,
  onSelectExam,
  onCreateExam,
  onTogglePublish,
  onDuplicateExam,
  onDeleteExam,
  quizTitle,
  onUpdateQuizTitle,
  timeLimitMinutes,
  onUpdateTimeLimit,
  questions,
  onUpdateQuestions,
  submissions,
  allSubmissions,
  onAddSimulatedStudent,
  onClearSubmissions,
  stats,
  itemAnalysis,
  onSwitchToLeaderboard,
}) => {
  // Manual question form state
  const [dashboardTab, setDashboardTab] = useState<'preview' | 'stats' | 'create' | 'settings' | 'all'>('preview');
  const [isEditingId, setIsEditingId] = useState<number | null>(null);
  const [topic, setTopic] = useState('พีชคณิต');
  const [questionText, setQuestionText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [activeField, setActiveField] = useState<'question' | 'choiceA' | 'choiceB' | 'choiceC' | 'choiceD' | 'explanation'>('question');

  // Multi-exam and modal states
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDesc, setNewExamDesc] = useState('');
  const [newExamTime, setNewExamTime] = useState(15);
  const [newExamPublished, setNewExamPublished] = useState(true);

  // PostgreSQL test states
  const [pgHost, setPgHost] = useState('localhost');
  const [pgPort, setPgPort] = useState('5432');
  const [pgUser, setPgUser] = useState('postgres');
  const [pgPassword, setPgPassword] = useState('');
  const [pgDatabase, setPgDatabase] = useState('postgres');
  const [pgTestResult, setPgTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [pgTesting, setPgTesting] = useState(false);

  const currentExam = exams.find((e) => e.id === currentExamId) || exams[0];

  const handleTestPostgres = async () => {
    setPgTesting(true);
    setPgTestResult(null);
    try {
      const res = await api.testPostgres({
        host: pgHost,
        port: Number(pgPort) || 5432,
        user: pgUser,
        password: pgPassword,
        database: pgDatabase,
      });
      setPgTestResult(res);
    } catch (err: any) {
      setPgTestResult({ success: false, message: err.message });
    } finally {
      setPgTesting(false);
    }
  };

  const handleCreateNewExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) {
      alert('กรุณากรอกชื่อชุดข้อสอบ');
      return;
    }
    onCreateExam({
      title: newExamTitle.trim(),
      description: newExamDesc.trim(),
      time_limit_minutes: Number(newExamTime) || 15,
      is_published: newExamPublished,
    });
    setNewExamTitle('');
    setNewExamDesc('');
    setNewExamTime(15);
    setNewExamPublished(true);
    setShowNewExamModal(false);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick helper to insert mathematical symbol into currently active input field
  const handleInsertSymbol = (snippet: string) => {
    if (activeField === 'question') {
      setQuestionText((prev) => prev + snippet);
    } else if (activeField === 'choiceA') {
      setChoiceA((prev) => prev + snippet);
    } else if (activeField === 'choiceB') {
      setChoiceB((prev) => prev + snippet);
    } else if (activeField === 'choiceC') {
      setChoiceC((prev) => prev + snippet);
    } else if (activeField === 'choiceD') {
      setChoiceD((prev) => prev + snippet);
    } else if (activeField === 'explanation') {
      setExplanation((prev) => prev + snippet);
    }
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      alert('กรุณากรอกคำถาม');
      return;
    }
    if (!choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
      alert('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ตัวเลือก');
      return;
    }

    if (isEditingId !== null) {
      // Update existing question
      const updated = questions.map((q) => {
        if (q.id === isEditingId) {
          return {
            ...q,
            topic: topic.trim() || 'ทั่วไป',
            question: questionText.trim(),
            choices: [choiceA.trim(), choiceB.trim(), choiceC.trim(), choiceD.trim()],
            correct_answer_index: correctIndex,
            explanation: explanation.trim(),
          };
        }
        return q;
      });
      onUpdateQuestions(updated);
      setIsEditingId(null);
    } else {
      // Add new question (Works whether file is uploaded or not!)
      const newId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
      const newQuestion: Question = {
        id: newId,
        topic: topic.trim() || 'ทั่วไป',
        question: questionText.trim(),
        choices: [choiceA.trim(), choiceB.trim(), choiceC.trim(), choiceD.trim()],
        correct_answer_index: correctIndex,
        explanation: explanation.trim(),
      };
      onUpdateQuestions([...questions, newQuestion]);
    }

    // Reset form fields
    setQuestionText('');
    setChoiceA('');
    setChoiceB('');
    setChoiceC('');
    setChoiceD('');
    setExplanation('');
    setCorrectIndex(0);
  };

  const handleEditClick = (q: Question) => {
    setIsEditingId(q.id);
    setTopic(q.topic);
    setQuestionText(q.question);
    setChoiceA(q.choices[0] || '');
    setChoiceB(q.choices[1] || '');
    setChoiceC(q.choices[2] || '');
    setChoiceD(q.choices[3] || '');
    setCorrectIndex(q.correct_answer_index);
    setExplanation(q.explanation || '');
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleDeleteQuestion = (id: number) => {
    if (confirm('ยืนยันลบข้อสอบข้อนี้หรือไม่?')) {
      onUpdateQuestions(questions.filter((q) => q.id !== id));
      if (isEditingId === id) setIsEditingId(null);
    }
  };

  // JSON File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.questions && Array.isArray(json.questions)) {
          if (json.quiz_title) onUpdateQuizTitle(json.quiz_title);
          if (json.time_limit_minutes) onUpdateTimeLimit(Number(json.time_limit_minutes));

          // Append or replace? Let user choose if questions already exist
          if (questions.length > 0) {
            const replace = confirm('ต้องการแทนที่ข้อสอบเดิมทั้งหมด หรือต้องการเพิ่มต่อท้าย?\n[ตกลง: แทนที่ทั้งหมด] / [ยกเลิก: นำมาเพิ่มต่อท้าย]');
            if (replace) {
              onUpdateQuestions(json.questions);
            } else {
              const startId = Math.max(...questions.map((q) => q.id)) + 1;
              const remapped = json.questions.map((q: Question, idx: number) => ({
                ...q,
                id: startId + idx,
              }));
              onUpdateQuestions([...questions, ...remapped]);
            }
          } else {
            onUpdateQuestions(json.questions);
          }
          alert(`✅ โหลดข้อสอบสำเร็จ (${json.questions.length} ข้อ)`);
        } else {
          alert('❌ ไฟล์ JSON ไม่ถูกต้อง (ต้องมีฟิลด์ questions)');
        }
      } catch {
        alert('❌ ไม่สามารถอ่านไฟล์ JSON ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsText(file);
  };

  // Download current active Quiz JSON to overwrite local file
  const handleDownloadQuizJson = () => {
    const data = {
      quiz_title: quizTitle || 'แบบทดสอบคณิตศาสตร์',
      time_limit_minutes: timeLimitMinutes || 15,
      questions: questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = {
      quiz_title: quizTitle || 'แบบทดสอบคณิตศาสตร์',
      time_limit_minutes: timeLimitMinutes || 15,
      questions: questions.length > 0 ? questions : [
        {
          id: 1,
          topic: 'เลขยกกำลัง',
          question: 'จงหาค่าของ $2^3 \\times 2^4$',
          choices: ['$2^7$', '$2^{12}$', '$4^7$', '$2^1$'],
          correct_answer_index: 0,
          explanation: 'ตามสมบัติเลขยกกำลัง $a^m \\times a^n = a^{m+n}$ ดังนั้น $2^3 \\times 2^4 = 2^7$',
        },
      ],
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_template_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>⚙️ ศูนย์ควบคุมและจัดทำข้อสอบของผู้สอน (Teacher Hub)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการข้อสอบแบบเรียลไทม์ เพิ่มโจทย์พร้อมสูตรคณิตศาสตร์ KaTeX และวิเคราะห์ค่ากลางผลคะแนน
          </p>
        </div>

        {/* Auto-saved Status & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>✓ บันทึกอัตโนมัติแล้ว ไม่ต้องเซฟทับ</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadQuizJson}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            title="สำรองไฟล์ข้อสอบชุดนี้เก็บไว้ในเครื่อง (เป็นทางเลือก ไม่จำเป็นต้องทำ)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>สำรองไฟล์ (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => exportScoresToExcel(submissions, questions, stats, itemAnalysis, quizTitle)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
            title="ส่งออกรายงานผลคะแนนนักเรียน, สถิติค่ากลาง และการวิเคราะห์รายข้อ เป็นไฟล์ Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📥 Export คะแนนเป็น Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportScoresToCsv(submissions, questions)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition flex items-center gap-1.5"
            title="ดาวน์โหลดไฟล์ CSV รองรับภาษาไทย UTF-8"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV (Excel Thai)</span>
          </button>
        </div>
      </div>

      {/* EXAM SET SWITCHER & PUBLISH CONTROL (ความต้องการหลักของคุณครู) */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-purple-50/30 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                จัดการชุดข้อสอบ
              </span>
              {currentExam && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    currentExam.is_published
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentExam.is_published ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                    }`}
                  />
                  {currentExam.is_published
                    ? '🟢 เปิดให้นักเรียนเห็นและทำได้ (Published)'
                    : '🟡 ซ่อนอยู่ (แบบร่าง - นักเรียนไม่เห็น)'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="exam-selector" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                เลือกชุดข้อสอบที่กำลังจัดการ:
              </label>
              <select
                id="exam-selector"
                value={currentExamId}
                onChange={(e) => onSelectExam(e.target.value)}
                className="font-bold text-sm sm:text-base text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs max-w-md truncate"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.is_published ? '🟢' : '🟡'} {exam.title} ({exam.questions.length} ข้อ • {exam.is_published ? 'เปิดสอบ' : 'ซ่อน'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Toggle Publish, Create New, Duplicate, Delete */}
          <div className="flex flex-wrap items-center gap-2">
            {currentExam && (
              <button
                type="button"
                onClick={() => onTogglePublish(currentExam.id, !currentExam.is_published)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-2 cursor-pointer ${
                  currentExam.is_published
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title={
                  currentExam.is_published
                    ? 'คลิกเพื่อซ่อนชุดข้อสอบนี้ ไม่ให้นักเรียนมองเห็น'
                    : 'คลิกเพื่อเปิดเผยแพร่ชุดข้อสอบนี้ ให้นักเรียนเข้ามาทำได้'
                }
              >
                {currentExam.is_published ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>ซ่อนจากนักเรียน (ปิดสอบ)</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>เปิดให้นักเรียนเห็น (เผยแพร่)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNewExamModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างชุดข้อสอบใหม่</span>
            </button>

            {currentExam && (
              <button
                type="button"
                onClick={() => onDuplicateExam(currentExam.id)}
                className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="คัดลอกชุดข้อสอบนี้เพื่อสร้างชุดใหม่"
              >
                <Copy className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">คัดลอกชุดนี้</span>
              </button>
            )}

            {currentExam && exams.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบ "${currentExam.title}"?`)) {
                    onDeleteExam(currentExam.id);
                  }
                }}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition cursor-pointer"
                title="ลบชุดข้อสอบนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Exam Set Pills for fast switching */}
        {exams.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 items-center">
            <span className="text-[11px] text-slate-500 font-medium mr-1">สลับชุดข้อสอบด่วน:</span>
            {exams.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelectExam(ex.id)}
                className={`text-xs px-3 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                  ex.id === currentExamId
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{ex.is_published ? '🟢' : '🟡'}</span>
                <span className="max-w-[150px] truncate">{ex.title}</span>
                <span className="text-[10px] opacity-75">({ex.questions.length} ข้อ)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap gap-2 text-xs sm:text-sm font-bold">
        <button
          type="button"
          onClick={() => setDashboardTab('preview')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>👁️ ดูตัวอย่างข้อสอบ & จัดการโจทย์ ({questions.length} ข้อ)</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('stats')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'stats'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>📊 สถิติคะแนน & การวิเคราะห์ ({submissions.length} คน)</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('create')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'create'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>➕ แบบฟอร์มเพิ่มโจทย์</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('settings')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
            dashboardTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>⚙️ นำเข้า/ส่งออก & ตั้งค่าเวลา</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('all')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 sm:ml-auto ${
            dashboardTab === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📑 แสดงทุกส่วน</span>
        </button>
      </div>

      {/* SECTION 1: QUESTION PREVIEW & LIVE EDITOR (Requirement) */}
      {(dashboardTab === 'preview' || dashboardTab === 'all') && (
        <TeacherQuestionPreview
          questions={questions}
          onUpdateQuestions={onUpdateQuestions}
        />
      )}

      {/* Central Tendency Section (ค่ากลางของคะแนนประเภทต่างๆ) */}
      {(dashboardTab === 'stats' || dashboardTab === 'all') && (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>สถิติค่ากลางและภาพรวมผลการสอบ (Central Tendency & Metrics)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คำนวณจากผู้สอบทั้งหมด {submissions.length} คน • อัปเดตสดแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddSimulatedStudent}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition flex items-center gap-1.5"
              title="สุ่มผลสอบนักเรียนใหม่ 1 คน เพื่อทดสอบการคำนวณค่ากลางและลีดเดอร์บอร์ดสด"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+จำลองผลสอบ 1 คน</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToLeaderboard}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 transition flex items-center gap-1.5"
            >
              <span>🏆 ไปที่ลีดเดอร์บอร์ด</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">ค่าเฉลี่ยเลขคณิต (Mean)</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {stats.mean} <span className="text-xs text-slate-400 font-normal">/ {questions.length}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              ({questions.length > 0 ? Math.round((stats.mean / questions.length) * 1000) / 10 : 0}%)
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">มัธยฐาน (Median)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats.median}</div>
            <span className="text-[11px] text-slate-400">คะแนนตำแหน่งกึ่งกลาง</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">ฐานนิยม (Mode)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {stats.mode.length > 0 ? stats.mode.join(', ') : '-'}
            </div>
            <span className="text-[11px] text-slate-400">คะแนนที่พบมากที่สุด</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">ส่วนเบี่ยงเบน (S.D.)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats.sd}</div>
            <span className="text-[11px] text-slate-400">การกระจายตัวของคะแนน</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">คะแนน สูงสุด / ต่ำสุด</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {stats.max} / {stats.min}
            </div>
            <span className="text-[11px] text-slate-400">Range: {stats.max - stats.min}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium">อัตราการสอบผ่าน</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.pass_rate}%</div>
            <span className="text-[11px] text-emerald-700">เกณฑ์คะแนน ≥ 50%</span>
          </div>
        </div>

        {/* Topic Breakdown of Mean Scores */}
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            📊 ค่าเฉลี่ยคะแนนแยกตามหัวข้อเนื้อหา (Topic Central Tendency):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {Object.values(stats.topic_stats || {}).map((t: any, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-indigo-900">{t.topic}</span>
                  <span className="text-slate-500 font-mono">{t.total_questions} ข้อ</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>คะแนนเฉลี่ย:</span>
                  <span className="font-bold text-slate-900">
                    {t.mean_score} / {t.total_questions} ({t.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, t.percentage)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Manual Question Creator & Editor Form */}
      {(dashboardTab === 'create' || dashboardTab === 'all') && (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <span>
                {isEditingId !== null
                  ? `แก้ไขโจทย์ข้อที่ ${isEditingId}`
                  : 'เพิ่มโจทย์ด้วยตัวเองทีละข้อ (ใส่ได้ทันทีทั้งแบบยังไม่แนบไฟล์หรือแนบไฟล์แล้ว)'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              รองรับการพิมพ์และก๊อปปี้สูตรคณิตศาสตร์ สัญลักษณ์ LaTeX และมีตัวช่วยพิมพ์พร้อมพรีวิวแบบสด
            </p>
          </div>

          {isEditingId !== null && (
            <button
              type="button"
              onClick={() => {
                setIsEditingId(null);
                setQuestionText('');
                setChoiceA('');
                setChoiceB('');
                setChoiceC('');
                setChoiceD('');
                setExplanation('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        {/* Math Symbol Picker Toolbar */}
        <MathSymbolPicker onInsertSymbol={handleInsertSymbol} />

        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หัวข้อเนื้อหา / Topic <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น พีชคณิต, เลขยกกำลัง, ตรีโกณมิติ, ความน่าจะเป็น"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กำหนดคำตอบที่ถูกต้อง <span className="text-rose-500">*</span>
              </label>
              <select
                value={correctIndex}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-emerald-800"
              >
                <option value={0}>ตัวเลือก A เป็นคำตอบที่ถูกต้อง</option>
                <option value={1}>ตัวเลือก B เป็นคำตอบที่ถูกต้อง</option>
                <option value={2}>ตัวเลือก C เป็นคำตอบที่ถูกต้อง</option>
                <option value={3}>ตัวเลือก D เป็นคำตอบที่ถูกต้อง</option>
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                โจทย์คำถาม (ใส่สูตรระหว่าง $...$ ได้) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">คลิกที่ช่องนี้เพื่อแทรกสัญลักษณ์จากแถบด้านบน</span>
            </div>
            <textarea
              rows={2}
              value={questionText}
              onFocus={() => setActiveField('question')}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="เช่น ถ้า $2x + 5 = 15$ แล้วค่าของ $x$ มีค่าเท่ากับเท่าใด"
              className="w-full p-3 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
            {/* Live Preview of question */}
            {questionText && (
              <div className="mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">
                  👁️ ตัวอย่างแสดงผลคำถาม (Live Math Preview):
                </span>
                <MathText text={questionText} />
              </div>
            )}
          </div>

          {/* 4 Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Choice A */}
            <div className={`p-3 rounded-xl border ${correctIndex === 0 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[11px]">A</span>
                  <span>ตัวเลือก A</span>
                </span>
                {correctIndex === 0 && <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">คำตอบที่ถูก</span>}
              </div>
              <input
                type="text"
                value={choiceA}
                onFocus={() => setActiveField('choiceA')}
                onChange={(e) => setChoiceA(e.target.value)}
                placeholder="เช่น $x = 5$"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {choiceA && (
                <div className="mt-1 text-xs text-slate-700">
                  <MathText text={choiceA} />
                </div>
              )}
            </div>

            {/* Choice B */}
            <div className={`p-3 rounded-xl border ${correctIndex === 1 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[11px]">B</span>
                  <span>ตัวเลือก B</span>
                </span>
                {correctIndex === 1 && <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">คำตอบที่ถูก</span>}
              </div>
              <input
                type="text"
                value={choiceB}
                onFocus={() => setActiveField('choiceB')}
                onChange={(e) => setChoiceB(e.target.value)}
                placeholder="เช่น $x = 10$"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {choiceB && (
                <div className="mt-1 text-xs text-slate-700">
                  <MathText text={choiceB} />
                </div>
              )}
            </div>

            {/* Choice C */}
            <div className={`p-3 rounded-xl border ${correctIndex === 2 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[11px]">C</span>
                  <span>ตัวเลือก C</span>
                </span>
                {correctIndex === 2 && <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">คำตอบที่ถูก</span>}
              </div>
              <input
                type="text"
                value={choiceC}
                onFocus={() => setActiveField('choiceC')}
                onChange={(e) => setChoiceC(e.target.value)}
                placeholder="เช่น $x = 3$"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {choiceC && (
                <div className="mt-1 text-xs text-slate-700">
                  <MathText text={choiceC} />
                </div>
              )}
            </div>

            {/* Choice D */}
            <div className={`p-3 rounded-xl border ${correctIndex === 3 ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-[11px]">D</span>
                  <span>ตัวเลือก D</span>
                </span>
                {correctIndex === 3 && <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">คำตอบที่ถูก</span>}
              </div>
              <input
                type="text"
                value={choiceD}
                onFocus={() => setActiveField('choiceD')}
                onChange={(e) => setChoiceD(e.target.value)}
                placeholder="เช่น $x = 7$"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {choiceD && (
                <div className="mt-1 text-xs text-slate-700">
                  <MathText text={choiceD} />
                </div>
              )}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              คำอธิบายเฉลยอย่างละเอียด (สำหรับแสดงเมื่อนักเรียนกดดูเฉลย)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onFocus={() => setActiveField('explanation')}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="เช่น ย้ายข้าง $2x = 15 - 5 = 10$ ดังนั้น $x = 5$"
              className="w-full p-3 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {explanation && (
              <div className="mt-1 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950">
                <span className="text-[10px] font-bold text-indigo-700 block mb-0.5">ตัวอย่างการแสดงผลเฉลย:</span>
                <MathText text={explanation} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditingId !== null ? 'บันทึกการแก้ไขโจทย์' : '+ บันทึกโจทย์ข้อนี้ลงในชุดข้อสอบ'}</span>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* JSON File Management & Quiz Metadata */}
      {(dashboardTab === 'settings' || dashboardTab === 'all') && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload & Template */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>นำเข้า / ส่งออกไฟล์ข้อสอบหลัก (JSON)</span>
          </h4>
          <p className="text-xs text-slate-500">
            สามารถอัปโหลดไฟล์ข้อสอบเพิ่ม หรือดาวน์โหลดไฟล์ Template ไปพิมพ์แก้ในเครื่อง
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadQuizJson}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="ดาวน์โหลดไฟล์สำรองชุดข้อสอบปัจจุบันเก็บไว้ในเครื่อง"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>💾 ดาวน์โหลดสำรองข้อสอบชุดนี้ ({questions.length} ข้อ)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>แนบไฟล์ข้อสอบ (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด Template ข้อสอบ</span>
            </button>
          </div>
        </div>

        {/* Quiz General Settings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>ตั้งค่าชื่อชุดข้อสอบและเวลา (ชุดปัจจุบัน)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อชุดข้อสอบ:</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => onUpdateQuizTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">เวลาสอบ (นาที):</label>
              <input
                type="number"
                min={1}
                max={180}
                value={timeLimitMinutes}
                onChange={(e) => onUpdateTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Database & Cloud Persistence Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>ระบบจัดเก็บฐานข้อมูลกลาง (Server Database)</span>
            </h4>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              บันทึกถาวรตลอดเวลา
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ระบบทำงานบนเซิร์ฟเวอร์แบบ Full-Stack ข้อมูลชุดข้อสอบและผลคะแนนจะถูกบันทึกลงดิสก์ถาวร <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">./data/mathquiz_db.json</code> อัปเดตตอนเช้าตอนบ่ายข้อมูลไม่หาย และทุกอุปกรณ์ (มือถือ/โน้ตบุ๊กนักเรียน) จะเห็นตรงกันทันที
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => api.exportDatabase()}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.json)</span>
            </button>
          </div>
        </div>

        {/* Docker pgAdmin & PostgreSQL Integration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Docker pgAdmin / PostgreSQL Integration</span>
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              PostgreSQL
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            รองรับการเชื่อมโยงไปยัง PostgreSQL บน Docker pgAdmin เพื่อจัดเก็บข้อมูลหรือสำรองข้อมูลภายนอก สามารถทดสอบการเชื่อมต่อได้ที่นี่:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Host:</label>
              <input
                type="text"
                value={pgHost}
                onChange={(e) => setPgHost(e.target.value)}
                placeholder="localhost"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Port:</label>
              <input
                type="text"
                value={pgPort}
                onChange={(e) => setPgPort(e.target.value)}
                placeholder="5432"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">User:</label>
              <input
                type="text"
                value={pgUser}
                onChange={(e) => setPgUser(e.target.value)}
                placeholder="postgres"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Password:</label>
              <input
                type="password"
                value={pgPassword}
                onChange={(e) => setPgPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Database:</label>
              <input
                type="text"
                value={pgDatabase}
                onChange={(e) => setPgDatabase(e.target.value)}
                placeholder="postgres"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestPostgres}
                disabled={pgTesting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pgTesting ? 'animate-spin' : ''}`} />
                <span>{pgTesting ? 'กำลังทดสอบ...' : 'ทดสอบต่อ PostgreSQL'}</span>
              </button>
            </div>
          </div>

          {pgTestResult && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                pgTestResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <b>{pgTestResult.success ? '✓ สำเร็จ: ' : 'ℹ️ แจ้งเตือน: '}</b>
              {pgTestResult.message}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Item Analysis (การวิเคราะห์รายข้อ - ข้อที่ตอบผิดมากที่สุด) */}
      {(dashboardTab === 'stats' || dashboardTab === 'all') && itemAnalysis.length > 0 && submissions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">🎯 การวิเคราะห์ความยากรายข้อ (Item Analysis)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เรียงตามร้อยละของผู้เรียนที่ตอบผิด สำหรับให้ผู้สอนเน้นย้ำจุดที่เข้าใจคลาดเคลื่อน
              </p>
            </div>
            <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-semibold border border-rose-200">
              ข้อที่ผิดมากสุดอยู่บนสุด
            </span>
          </div>

          <div className="space-y-3">
            {itemAnalysis.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${idx === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                    อันดับความยาก #{idx + 1} • ตอบผิด {item.error_rate}% ({item.wrong_count}/{item.total_answered} คน)
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                    {item.topic}
                  </span>
                </div>

                <div className="text-sm font-medium text-slate-800">
                  <span className="text-indigo-600 font-bold">ข้อที่ {item.id}: </span>
                  <MathText text={item.question} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  {item.choices.map((ch, cIdx) => {
                    const isCorrect = cIdx === item.correct_answer_index;
                    return (
                      <div
                        key={cIdx}
                        className={`p-2 rounded-lg border flex justify-between items-center ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
                            {['A', 'B', 'C', 'D'][cIdx]}
                          </span>
                          <span className="truncate"><MathText text={ch} /></span>
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0 ml-1">{item.choice_counts[cIdx]} คน</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: สร้างชุดข้อสอบใหม่ */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>สร้างชุดข้อสอบใหม่</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewExamModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewExamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ชื่อชุดข้อสอบ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="เช่น แบบทดสอบกลางภาค วิชาคณิตศาสตร์ ม.4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  คำอธิบายหรือเนื้อหาบทเรียน
                </label>
                <textarea
                  rows={3}
                  value={newExamDesc}
                  onChange={(e) => setNewExamDesc(e.target.value)}
                  placeholder="เช่น ข้อสอบวัดผลการเรียนรู้บทที่ 1-3 เรื่องเซต และตรรกศาสตร์..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  กำหนดเวลาทำข้อสอบ (นาที) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={newExamTime}
                  onChange={(e) => setNewExamTime(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer"
                onClick={() => setNewExamPublished(!newExamPublished)}
              >
                <div>
                  <span className="text-sm font-bold text-slate-800 block">เปิดเผยแพร่ให้นักเรียนเห็นทันที</span>
                  <span className="text-xs text-slate-500">หากปิดไว้ จะถูกบันทึกเป็นแบบร่าง (นักเรียนจะไม่เห็นจนกว่าครูจะเปิด)</span>
                </div>
                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition ${newExamPublished ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${newExamPublished ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewExamModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างชุดข้อสอบ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
