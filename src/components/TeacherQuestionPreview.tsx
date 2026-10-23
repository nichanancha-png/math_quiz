import React, { useState, useRef } from 'react';
import {
  Eye,
  Edit3,
  Trash2,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Layers,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Check,
  RotateCcw,
  Upload,
  Download,
  FileCode,
} from 'lucide-react';
import { Question } from '../types';
import { MathText } from '../utils/mathRenderer';
import { QuestionModalEditor } from './QuestionModalEditor';

interface TeacherQuestionPreviewProps {
  questions: Question[];
  onUpdateQuestions: (questions: Question[]) => void;
}

export const TeacherQuestionPreview: React.FC<TeacherQuestionPreviewProps> = ({
  questions,
  onUpdateQuestions,
}) => {
  const [viewMode, setViewMode] = useState<'simulator' | 'all_cards'>('simulator');
  const [previewIdx, setPreviewIdx] = useState<number>(0);
  const [simulatedChoice, setSimulatedChoice] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  // Modal Editor states
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | undefined>(undefined);

  // Filter for all cards mode
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);

        let incomingList: any[] = [];
        if (Array.isArray(parsed)) {
          incomingList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.questions)) {
            incomingList = parsed.questions;
          }
        }

        if (!Array.isArray(incomingList) || incomingList.length === 0) {
          alert('❌ ไฟล์ JSON ไม่ถูกต้อง (ต้องมีรายการข้อสอบ หรือคีย์ "questions")');
          return;
        }

        const sanitized: Question[] = incomingList
          .map((q: any, idx: number) => ({
            id: typeof q.id === 'number' ? q.id : (Date.now() + idx),
            topic: q.topic || 'คณิตศาสตร์',
            question: q.question || q.questionText || '',
            choices: Array.isArray(q.choices) ? q.choices : (q.options || ['', '', '', '']),
            correct_answer_index: typeof q.correct_answer_index === 'number' ? q.correct_answer_index : (typeof q.correctIndex === 'number' ? q.correctIndex : 0),
            explanation: q.explanation || '',
          }))
          .filter((q: Question) => q.question.trim().length > 0 && q.choices.length >= 2);

        if (sanitized.length === 0) {
          alert('❌ ไม่พบข้อสอบที่สมบูรณ์ในไฟล์ JSON');
          return;
        }

        let replace = true;
        if (questions.length > 0) {
          replace = confirm(
            `พบข้อสอบ ${sanitized.length} ข้อในไฟล์\nต้องการ "แทนที่" ข้อสอบเดิมทั้งหมด (${questions.length} ข้อ) หรือไม่?\n\n[ตกลง: แทนที่ทั้งหมด] / [ยกเลิก: นำมาเพิ่มต่อท้าย]`
          );
        }

        if (replace) {
          onUpdateQuestions(sanitized);
        } else {
          const startId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
          const renumbered = sanitized.map((q, i) => ({ ...q, id: startId + i }));
          onUpdateQuestions([...questions, ...renumbered]);
        }

        alert(`✅ นำเข้าข้อสอบสำเร็จเรียบร้อย (${sanitized.length} ข้อ)`);
      } catch (err: any) {
        alert('❌ ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message);
      } finally {
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const data = {
      quiz_title: 'แบบทดสอบคณิตศาสตร์ (MathQuiz)',
      questions_count: questions.length,
      exported_at: new Date().toISOString(),
      questions: questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_questions_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = {
      quiz_title: 'แบบทดสอบคณิตศาสตร์ (ตัวอย่าง)',
      time_limit_minutes: 15,
      questions: [
        {
          id: 1,
          topic: 'เลขยกกำลัง',
          question: 'จงหาค่าของ $2^3 \\times 2^4$',
          choices: ['$2^7$', '$2^{12}$', '$4^7$', '$2^1$'],
          correct_answer_index: 0,
          explanation: 'ตามสมบัติเลขยกกำลัง $a^m \\times a^n = a^{m+n}$ ดังนั้น $2^3 \\times 2^4 = 2^7 = 128$',
        },
        {
          id: 2,
          topic: 'พีชคณิต',
          question: 'ถ้า $2x + 5 = 15$ แล้ว $x$ มีค่าเท่ากับเท่าใด',
          choices: ['$x = 5$', '$x = 10$', '$x = 3$', '$x = 7$'],
          correct_answer_index: 0,
          explanation: 'ย้ายข้างสมการ $2x = 15 - 5 = 10 \\Rightarrow x = 5$',
        },
      ],
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ตัวอย่างไฟล์ข้อสอบ_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const letters = ['A', 'B', 'C', 'D'];

  // Safe index
  const activeIdx = Math.min(Math.max(0, previewIdx), Math.max(0, questions.length - 1));
  const currentQ = questions[activeIdx];

  // Actions
  const handleOpenAddNew = (afterIndex?: number) => {
    setEditingQuestion(null);
    setInsertIndex(afterIndex !== undefined ? afterIndex + 1 : questions.length);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setInsertIndex(undefined);
    setIsEditorOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(`ยืนยันการลบข้อสอบข้อนี้หรือไม่?`)) {
      const updated = questions.filter((q) => q.id !== id);
      onUpdateQuestions(updated);
      if (previewIdx >= updated.length && updated.length > 0) {
        setPreviewIdx(updated.length - 1);
      }
      setSimulatedChoice(null);
    }
  };

  const handleDuplicate = (q: Question, atIndex: number) => {
    const newId = Date.now();
    const cloned: Question = {
      ...q,
      id: newId,
      question: `${q.question} (ฉบับแก้ไข)`,
    };
    const nextQuestions = [...questions];
    nextQuestions.splice(atIndex + 1, 0, cloned);
    onUpdateQuestions(nextQuestions);
    setPreviewIdx(atIndex + 1);
    setSimulatedChoice(null);
  };

  const handleMove = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    onUpdateQuestions(reordered);
    setPreviewIdx(toIndex);
  };

  const handleSaveFromEditor = (savedQ: Question, targetInsertIndex?: number) => {
    if (editingQuestion) {
      // Edit existing
      const updated = questions.map((q) => (q.id === savedQ.id ? savedQ : q));
      onUpdateQuestions(updated);
    } else if (targetInsertIndex !== undefined && targetInsertIndex >= 0 && targetInsertIndex <= questions.length) {
      // Insert at specific index
      const updated = [...questions];
      updated.splice(targetInsertIndex, 0, savedQ);
      onUpdateQuestions(updated);
      setPreviewIdx(targetInsertIndex);
    } else {
      // Append to the end
      onUpdateQuestions([...questions, savedQ]);
      setPreviewIdx(questions.length);
    }
    setSimulatedChoice(null);
  };

  // Topics for filter
  const allTopics = Array.from(new Set(questions.map((q) => q.topic || 'ทั่วไป')));

  const filteredQuestions = questions.filter((q) => {
    const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
    const matchesSearch =
      !searchQuery ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.choices.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTopic && matchesSearch;
  });

  return (
    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-indigo-200 shadow-sm space-y-6">
      {/* Top Header with view toggles & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
              👁️
            </div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              ระบบดูตัวอย่างข้อสอบ & จัดการข้อสอบ (Exam Preview & Live Editor)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ดูตัวอย่างมุมมองที่นักเรียนเห็นจริง พร้อมปุ่มแก้ไข เพิ่ม หรือลบข้อสอบได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View mode switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'simulator'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>มุมมองเสมือนจริง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all_cards')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'all_cards'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>รายการการ์ดทั้งหมด ({questions.length})</span>
            </button>
          </div>

          {/* Hidden JSON file input */}
          <input
            type="file"
            ref={jsonInputRef}
            accept=".json,application/json"
            className="hidden"
            onChange={handleJsonImport}
          />

          {/* Import JSON button */}
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
            title="นำเข้าข้อสอบจากไฟล์ .json"
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าข้อสอบ (JSON)</span>
          </button>

          {/* Export JSON button */}
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1.5"
            title="ดาวน์โหลดข้อสอบชุดนี้เป็นไฟล์ JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>ส่งออก JSON</span>
          </button>

          {/* Download Template button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
            title="ดาวน์โหลดตัวอย่างไฟล์ JSON สำหรับจัดทำข้อสอบ"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>ตัวอย่างไฟล์</span>
          </button>

          {/* "+ เพิ่มข้อสอบใหม่" button */}
          <button
            type="button"
            onClick={() => handleOpenAddNew()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5 ml-auto sm:ml-0"
            title="เพิ่มข้อสอบใหม่เข้าสู่ระบบ"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มข้อสอบใหม่</span>
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="text-4xl">📝</div>
          <div className="font-bold text-slate-700 text-sm">ยังไม่มีข้อสอบในระบบ</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            คุณสามารถเพิ่มข้อสอบข้อแรกได้ทันทีโดยคลิกปุ่มด้านล่าง หรืออัปโหลดไฟล์ JSON
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleOpenAddNew()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มข้อสอบข้อแรก</span>
            </button>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>นำเข้าข้อสอบ (JSON)</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'simulator' && currentQ ? (
        /* ------------------------------------------------------------- */
        /* MODE 1: INTERACTIVE STUDENT VIEW SIMULATOR FOR TEACHER        */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          {/* Question Navigation Numbers Bar */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>เลือกดูตัวอย่างข้อสอบ:</span>
                <span className="text-indigo-700 font-extrabold font-mono">
                  ข้อ {activeIdx + 1} / {questions.length}
                </span>
              </span>
              <span className="text-slate-500 text-[11px]">
                คลิกหมายเลขเพื่อสลับข้อ • ใช้ลูกศรเลื่อนดู
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {questions.map((q, idx) => {
                const isSelected = idx === activeIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setPreviewIdx(idx);
                      setSimulatedChoice(null);
                    }}
                    className={`h-9 min-w-[36px] px-2 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400 ring-offset-1'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={`ข้อที่ ${idx + 1}: ${q.topic}`}
                  >
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Simulated Question Preview Card */}
          <div className="p-6 sm:p-7 rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-white to-slate-50/50 shadow-sm space-y-6">
            {/* Top Toolbar right above the question */}
            <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-indigo-700">
                  ข้อที่ {activeIdx + 1} จาก {questions.length}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-800 font-bold px-3 py-0.5 rounded-full border border-indigo-200">
                  {currentQ.topic || 'ทั่วไป'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  (ID: {currentQ.id})
                </span>
              </div>

              {/* ACTION TOOLBAR: EDIT, ADD, DUPLICATE, DELETE */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentQ)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs"
                  title="แก้ไขโจทย์ ตัวเลือก และเฉลยข้อนี้"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>แก้ไขข้อนี้</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddNew(activeIdx)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs"
                  title="แทรกข้อสอบใหม่ต่อจากข้อนี้ทันที"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เพิ่มข้อต่อท้าย</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDuplicate(currentQ, activeIdx)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 transition flex items-center gap-1"
                  title="ทำสำเนาข้อสอบข้อนี้"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden md:inline">คัดลอก</span>
                </button>

                <div className="flex items-center border-l border-slate-200 pl-1.5 gap-1">
                  <button
                    type="button"
                    disabled={activeIdx === 0}
                    onClick={() => handleMove(activeIdx, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="เลื่อนข้อนี้ขึ้นด้านบน"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeIdx === questions.length - 1}
                    onClick={() => handleMove(activeIdx, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="เลื่อนข้อนี้ลงด้านล่าง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(currentQ.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition ml-1"
                    title="ลบข้อนี้ออกจากระบบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Question Display (Student view simulation) */}
            <div className="text-lg sm:text-xl font-medium text-slate-900 leading-relaxed">
              <MathText text={currentQ.question} />
            </div>

            {/* 4 Choices Interactive Simulation */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                <span>ตัวเลือกคำตอบ (ทดลองคลิกเพื่อดูการแสดงผล):</span>
                <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ✓ ข้อที่ครูกำหนดให้ถูกต้อง: ข้อ {letters[currentQ.correct_answer_index]}
                </span>
              </div>

              {currentQ.choices.map((ch, cIdx) => {
                const isSelectedInPreview = simulatedChoice === cIdx;
                const isTheCorrectChoice = cIdx === currentQ.correct_answer_index;

                let cardBorderClass = 'border-slate-200 bg-white hover:border-slate-300';
                if (isTheCorrectChoice) {
                  cardBorderClass = 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400';
                } else if (isSelectedInPreview) {
                  cardBorderClass = 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400';
                }

                return (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => setSimulatedChoice(cIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-3.5 text-sm sm:text-base ${cardBorderClass}`}
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                        isTheCorrectChoice
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isSelectedInPreview
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {letters[cIdx]}
                    </span>

                    <span className="flex-1 font-normal text-slate-800">
                      <MathText text={ch} />
                    </span>

                    {isTheCorrectChoice && (
                      <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                        <Check className="w-3.5 h-3.5" /> คำตอบที่ถูก
                      </span>
                    )}
                    {isSelectedInPreview && !isTheCorrectChoice && (
                      <span className="text-xs bg-indigo-100 text-indigo-900 font-medium px-2 py-0.5 rounded-full shrink-0">
                        คุณกำลังทดสอบเลือกข้อนี้
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Solution Preview */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>
                    {showExplanation
                      ? '💡 ซ่อนตัวอย่างคำอธิบายเฉลย ▲'
                      : '💡 แสดงตัวอย่างคำอธิบายเฉลย (สิ่งที่นักเรียนจะเห็นเมื่อคลิกดูเฉลย) ▼'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentQ)}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>แก้คำอธิบายเฉลย</span>
                </button>
              </div>

              {showExplanation && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs sm:text-sm text-slate-800 space-y-2 animate-in fade-in">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>คำอธิบายและวิธีคิดอย่างละเอียด (Detailed Solution):</span>
                  </div>
                  {currentQ.explanation ? (
                    <div className="pl-3 border-l-2 border-amber-400 text-slate-800 leading-relaxed font-normal">
                      <MathText text={currentQ.explanation} />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      (ยังไม่ได้ใส่คำอธิบายเฉลย - คลิกปุ่ม "แก้ไขข้อนี้" เพื่อเพิ่มวิธีคิด)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Carousel Navigation Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs sm:text-sm font-semibold">
              <button
                type="button"
                disabled={activeIdx === 0}
                onClick={() => {
                  setPreviewIdx(activeIdx - 1);
                  setSimulatedChoice(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ข้อก่อนหน้า ({activeIdx})</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentQ)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อนี้</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(currentQ.id)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบข้อนี้</span>
                </button>
              </div>

              <button
                type="button"
                disabled={activeIdx === questions.length - 1}
                onClick={() => {
                  setPreviewIdx(activeIdx + 1);
                  setSimulatedChoice(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>ข้อถัดไป ({activeIdx + 2})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MODE 2: ALL QUESTIONS CARDS OVERVIEW WITH QUICK ACTIONS       */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-700 shrink-0">กรองตามหัวข้อ:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-slate-700 outline-none"
              >
                <option value="all">ทุกหัวข้อ ({questions.length})</option>
                {allTopics.map((t) => (
                  <option key={t} value={t}>
                    {t} ({questions.filter((q) => q.topic === t).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ค้นหาคำในโจทย์/คำตอบ..."
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 outline-none text-xs"
              />
            </div>
          </div>

          {/* Cards Grid / List */}
          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => {
              const originalIndex = questions.findIndex((orig) => orig.id === q.id);
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 shadow-2xs transition space-y-3"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-700 text-sm">
                        ข้อที่ {originalIndex + 1}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIdx(originalIndex);
                          setViewMode('simulator');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium rounded-lg transition flex items-center gap-1"
                        title="ดูตัวอย่างแบบจำลอง"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>พรีวิว</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(q)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition flex items-center gap-1"
                        title="แก้ไขข้อนี้"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>แก้ไข</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(q, originalIndex)}
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                        title="ทำสำเนาข้อนี้"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        title="ลบข้อนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-slate-900 font-medium text-sm sm:text-base">
                    <MathText text={q.question} />
                  </div>

                  {/* Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {q.choices.map((ch, cIdx) => {
                      const isCorrect = cIdx === q.correct_answer_index;
                      return (
                        <div
                          key={cIdx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950 ring-1 ring-emerald-400'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {letters[cIdx]}
                          </span>
                          <span className="flex-1">
                            <MathText text={ch} />
                          </span>
                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-slate-700">
                      <span className="font-bold text-amber-900 block mb-0.5">📖 เฉลยละเอียด:</span>
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Edit / Add Modal */}
      <QuestionModalEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        questionToEdit={editingQuestion}
        insertIndex={insertIndex}
        totalQuestions={questions.length}
        onSave={handleSaveFromEditor}
      />
    </div>
  );
};
