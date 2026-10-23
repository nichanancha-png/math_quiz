import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SkipForward,
  Send,
  Trophy,
  Check,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Settings,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Zap,
  BookOpen,
  Layers,
  Search,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamSet, ExplanationTiming, Question, StudentAnswerDetail, StudentSubmission } from '../types';
import { MathText } from '../utils/mathRenderer';

interface StudentExamProps {
  quizTitle: string;
  questions: Question[];
  timeLimitMinutes: number;
  availableExams?: ExamSet[];
  activeExamId?: string;
  onSelectExam?: (examId: string) => void;
  onSubmit: (submission: StudentSubmission) => void;
  onViewLeaderboard: () => void;
  onRefreshExams?: () => void;
}

export const StudentExam: React.FC<StudentExamProps> = ({
  quizTitle,
  questions,
  timeLimitMinutes,
  availableExams,
  activeExamId,
  onSelectExam,
  onSubmit,
  onViewLeaderboard,
  onRefreshExams,
}) => {
  // Gatekeeper states
  const [isPickingExam, setIsPickingExam] = useState<boolean>(() => !activeExamId);
  const [examSearch, setExamSearch] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [explanationTiming, setExplanationTiming] = useState<ExplanationTiming>(() => {
    return (localStorage.getItem('mathquiz_explanation_timing') as ExplanationTiming) || 'on_submit';
  });

  // Save explanation timing preference
  useEffect(() => {
    localStorage.setItem('mathquiz_explanation_timing', explanationTiming);
  }, [explanationTiming]);

  // Exam flow states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<number[]>([]);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  // Timer & Focus tracking
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitMinutes * 60);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<StudentSubmission | null>(null);

  const letters = ['A', 'B', 'C', 'D'];
  const timerRef = useRef<any>(null);

  // Timer loop
  useEffect(() => {
    if (isStarted && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleForceAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
        setTimeTaken((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isStarted, isSubmitted]);

  // Anti-cheat focus tracking
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabViolations((v) => {
          const next = v + 1;
          if (next >= 3) {
            alert('🚨 คุณสลับหน้าจอเกิน 3 ครั้ง ระบบได้ส่งข้อสอบโดยอัตโนมัติ');
            handleForceAutoSubmitOnTimeout();
          } else {
            alert(`⚠️ คำเตือน! กรุณาทำข้อสอบในหน้านี้ (ตรวจพบการสลับหน้าจอ ครั้งที่ ${next}/3)`);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStarted, isSubmitted]);

  const handleStartExam = () => {
    if (!studentName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล หรือ รหัสนักเรียนก่อนเริ่มทำข้อสอบ');
      return;
    }
    setIsStarted(true);
    setRemainingSeconds(timeLimitMinutes * 60);
  };

  const handleSelectChoice = (questionId: number, choiceIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: choiceIdx }));
    // When answered, remove from skipped list
    setSkippedQuestionIds((prev) => prev.filter((id) => id !== questionId));
    if (explanationTiming === 'immediate_auto') {
      setRevealedSolutions((prev) => ({ ...prev, [questionId]: true }));
    }
  };

  const handleToggleReveal = (questionId: number) => {
    setRevealedSolutions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Requirement:
  // "ถ้านักเรียนข้ามข้อ สุดท้ายต้องบังคับให้ตอบให้ครบ สามารถเลือกข้อที่จะไปได้ข้างๆแบบมีเลขข้อทั้งหมด"
  const handleSkipQuestion = () => {
    const q = questions[currentIdx];
    if (!q) return;

    // Mark current question as skipped if not yet answered
    if (userAnswers[q.id] === undefined && !skippedQuestionIds.includes(q.id)) {
      setSkippedQuestionIds((prev) => [...prev, q.id]);
    }

    // Find the next question to work on:
    // 1. Look forward from currentIdx + 1 for an unanswered question
    let nextIndex = -1;
    for (let i = currentIdx + 1; i < questions.length; i++) {
      if (userAnswers[questions[i].id] === undefined) {
        nextIndex = i;
        break;
      }
    }

    // 2. If none ahead, loop from beginning for any unanswered question
    if (nextIndex === -1) {
      for (let i = 0; i < currentIdx; i++) {
        if (userAnswers[questions[i].id] === undefined) {
          nextIndex = i;
          break;
        }
      }
    }

    if (nextIndex !== -1) {
      setCurrentIdx(nextIndex);
    } else if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }

    // If at the end, check if any questions were skipped or unanswered!
    const unansweredIdx = questions.findIndex(
      (q, idx) => idx !== currentIdx && userAnswers[q.id] === undefined
    );

    if (unansweredIdx !== -1) {
      setCurrentIdx(unansweredIdx);
    }
  };

  // Find all unfinished question indices
  const getUnansweredIndices = () => {
    return questions
      .map((q, idx) => (userAnswers[q.id] === undefined ? idx : -1))
      .filter((idx) => idx !== -1);
  };

  // Requirement:
  // "ถ้านักเรียนข้ามข้อ สุดท้ายต้องบังคับให้ตอบให้ครบ"
  const handleSubmitExam = () => {
    const unanswered = getUnansweredIndices();

    if (unanswered.length > 0) {
      // Enforce answering all questions!
      setShowIncompleteModal(true);
      return;
    }

    finalizeSubmission();
  };

  // For auto-submit only when time runs out
  const handleForceAutoSubmitOnTimeout = () => {
    finalizeSubmission();
  };

  const finalizeSubmission = () => {
    clearInterval(timerRef.current);

    let score = 0;
    const details: Record<string, StudentAnswerDetail> = {};

    questions.forEach((q) => {
      const chosen = userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1;
      const isCorrect = chosen === q.correct_answer_index;
      if (isCorrect) score += 1;

      details[String(q.id)] = {
        chosen,
        correct: q.correct_answer_index,
        is_correct: isCorrect,
        explanation: q.explanation,
        topic: q.topic || 'ทั่วไป',
      };
    });

    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 1000) / 10 : 0;

    const submission: StudentSubmission = {
      id: `sub-${Date.now()}`,
      exam_id: activeExamId,
      exam_title: quizTitle,
      student_name: studentName,
      score,
      total,
      percentage,
      time_taken_seconds: timeTaken,
      submitted_at: new Date().toLocaleString('th-TH'),
      answers: details,
      tab_violations: tabViolations,
    };

    setSubmittedResult(submission);
    setIsSubmitted(true);
    setShowIncompleteModal(false);
    onSubmit(submission);

    if (percentage >= 80) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // VIEW 0: EXAM SET SELECTION (นักเรียนเลือกชุดข้อสอบที่จะทำ)
  // -------------------------------------------------------------
  if (isPickingExam && availableExams && availableExams.length > 0) {
    const publishedList = availableExams.filter((e) => e.is_published);
    const filtered = publishedList.filter(
      (e) =>
        e.title.toLowerCase().includes(examSearch.toLowerCase()) ||
        e.description.toLowerCase().includes(examSearch.toLowerCase())
    );

    return (
      <div className="max-w-4xl mx-auto my-6 space-y-6">
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 bg-white/20 rounded-full inline-block backdrop-blur-sm">
              ระบบสอบออนไลน์ MathQuiz Pro
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              เลือกชุดข้อสอบคณิตศาสตร์ที่ต้องการทำ
            </h1>
            <p className="text-sm text-indigo-100 max-w-2xl leading-relaxed">
              ชุดข้อสอบที่เปิดให้ทำในขณะนี้ได้รับการอัปเดตและเผยแพร่โดยคุณครู กรุณาเลือกชุดข้อสอบที่คุณต้องการเริ่มทำ
            </p>
          </div>
          {onRefreshExams && (
            <button
              type="button"
              onClick={onRefreshExams}
              className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="ตรวจสอบชุดข้อสอบใหม่"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">รีเฟรชข้อสอบ</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            value={examSearch}
            onChange={(e) => setExamSearch(e.target.value)}
            placeholder="ค้นหาชุดข้อสอบตามชื่อ หรือเนื้อหา..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
          />
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            เปิดสอบ {publishedList.length} ชุด
          </span>
        </div>

        {/* Exams List */}
        {filtered.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-800">ไม่พบชุดข้อสอบที่ตรงกับการค้นหา</h3>
            <p className="text-xs text-slate-500">กรุณาลองเปลี่ยนคำค้นหา หรือกดรีเฟรชเพื่ออัปเดตชุดข้อสอบล่าสุด</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((exam) => {
              const isSelected = activeExamId === exam.id;
              return (
                <div
                  key={exam.id}
                  className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between hover:shadow-md ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        เปิดให้สอบแล้ว
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        ⏱️ {exam.time_limit_minutes} นาที
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 line-clamp-2">
                      {exam.title}
                    </h3>

                    {exam.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {exam.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 text-[11px] text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                        📝 {exam.questions.length} ข้อ
                      </span>
                      {exam.questions.length > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-medium">
                          โจทย์คณิตศาสตร์ KaTeX
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectExam) onSelectExam(exam.id);
                        setIsPickingExam(false);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>เลือกชุดนี้เพื่อเริ่มสอบ</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // If there are NO published exams available at all
  if (availableExams && availableExams.length > 0 && availableExams.filter((e) => e.is_published).length === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">ยังไม่มีชุดข้อสอบที่เปิดให้สอบในขณะนี้</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            คุณครูอาจกำลังเตรียมชุดข้อสอบ หรือปิดการสอบชั่วคราว กรุณารอคุณครูเปิดการเผยแพร่ข้อสอบ หรือกดรีเฟรชอีกครั้ง
          </p>
        </div>
        {onRefreshExams && (
          <button
            type="button"
            onClick={onRefreshExams}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ตรวจสอบชุดข้อสอบอีกครั้ง</span>
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: GATEKEEPER / REGISTRATION & EXPLANATION SETTING
  // -------------------------------------------------------------
  if (!isStarted) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-6">
        {/* Back to Exam Selection button */}
        {availableExams && availableExams.length > 1 && (
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setIsPickingExam(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← เลือกชุดข้อสอบอื่น</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500">
              ชุดข้อสอบที่เลือก: {quizTitle}
            </span>
          </div>
        )}

        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mx-auto shadow-2xs">
          📐
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-800">{quizTitle}</h2>
          <p className="text-sm text-slate-500 mt-1">
            ข้อสอบจำนวน {questions.length} ข้อ • กำหนดเวลา {timeLimitMinutes} นาที
          </p>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              ชื่อ-นามสกุล หรือ รหัสนักเรียน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="เช่น ด.ช. ปัญญวัฒน์ ชัยมงคล (ม.3/1 เลขที่ 15)"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
              autoFocus
            />
          </div>

          {/* Explanation Timing Selection before Exam */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                เลือกช่วงเวลาการขอเฉลยและวิธีคิด <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                กำหนดได้ก่อนสอบ
              </span>
            </div>
            <p className="text-xs text-slate-500">
              เลือกลักษณะการเปิดเผยผลเฉลยและวิธีคิดที่เหมาะสมกับเป้าหมายของคุณ:
            </p>

            <div className="space-y-2">
              {/* Option 1: On Submit (Exam Mode) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExplanationTiming('on_submit')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExplanationTiming('on_submit'); }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  explanationTiming === 'on_submit'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/25 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      explanationTiming === 'on_submit'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {explanationTiming === 'on_submit' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>ดูเฉลยทั้งหมดหลังส่งข้อสอบ</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      โหมดสอบจริง (แนะนำ)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    ไม่เปิดเผยเฉลยระหว่างทำข้อสอบ เพื่อให้มีสมาธิและวัดผลได้สมจริงที่สุด จะสรุปคะแนนพร้อมเฉลยละเอียดทุกข้อทันทีเมื่อส่งข้อสอบ
                  </p>
                </div>
              </div>

              {/* Option 2: Instant / On-demand Click (Practice Mode) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExplanationTiming('instant')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExplanationTiming('instant'); }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  explanationTiming === 'instant'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/25 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      explanationTiming === 'instant'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {explanationTiming === 'instant' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>กดดูเฉลยได้ทันทีหลังตอบแต่ละข้อ</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      โหมดฝึกฝน (ยอดนิยม)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    เมื่อเลือกคำตอบแล้ว สามารถคลิกปุ่มเพื่อเปิดดูเฉลยคำตอบที่ถูกและขั้นตอนการคำนวณได้ทันที ช่วยให้เข้าใจข้อผิดพลาดก่อนไปข้อถัดไป
                  </p>
                </div>
              </div>

              {/* Option 3: Immediate Auto (Speed Review Mode) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExplanationTiming('immediate_auto')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExplanationTiming('immediate_auto'); }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  explanationTiming === 'immediate_auto'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/25 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      explanationTiming === 'immediate_auto'
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {explanationTiming === 'immediate_auto' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>เปิดเฉลยอัตโนมัติทันทีเมื่อเลือกตอบ</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      โหมดเฉลยสด & ติวเข้ม
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    ทันทีที่คลิกเลือกตัวเลือก ระบบจะกางเฉลยและวิธีคิดให้เห็นทันทีโดยไม่ต้องกดปุ่ม เหมาะสำหรับการติวโจทย์และทบทวนเนื้อหาอย่างรวดเร็ว
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>กติกาการสอบสำคัญ:</span>
            </div>
            <ul className="list-disc list-inside text-amber-800/90 pl-1 space-y-0.5">
              <li>คุณสามารถกดปุ่ม <b>"ข้ามข้อนี้ไปก่อน"</b> เพื่อข้ามไปทำข้ออื่นได้</li>
              <li>ระบบมีแผงเลือกข้อด้านข้าง แสดงสถานะวงกลมสีเทา, เหลืองส้ม และเขียว</li>
              <li><b>บังคับตอบให้ครบทุกข้อ:</b> ระบบจะไม่อนุญาตให้ส่งข้อสอบจนกว่าจะตอบครบทุกข้อ</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleStartExam}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <span>เริ่มทำข้อสอบคณิตศาสตร์</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: POST-EXAM RESULTS & COMPREHENSIVE SOLUTIONS
  // -------------------------------------------------------------
  if (isSubmitted && submittedResult) {
    return (
      <div className="max-w-3xl mx-auto my-6 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto shadow-2xs">
            {submittedResult.percentage >= 50 ? '🎉' : '📖'}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">ส่งคำตอบเรียบร้อยแล้ว</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              ผู้สอบ: <b>{submittedResult.student_name}</b> • ใช้เวลา {Math.floor(submittedResult.time_taken_seconds / 60)} นาที {submittedResult.time_taken_seconds % 60} วินาที
            </p>
          </div>

          <div className="py-2">
            <div className="text-5xl font-black text-indigo-700">
              {submittedResult.score} <span className="text-2xl font-medium text-slate-400">/ {submittedResult.total}</span>
            </div>
            <div className="text-sm font-semibold text-slate-600 mt-1">
              คิดเป็นร้อยละ {submittedResult.percentage}% • {submittedResult.percentage >= 50 ? (
                <span className="text-emerald-600">ผ่านเกณฑ์การทดสอบ ✓</span>
              ) : (
                <span className="text-rose-600">ยังไม่ผ่านเกณฑ์ทดสอบ (ต่ำกว่า 50%)</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onViewLeaderboard}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-2 text-sm"
            >
              <Trophy className="w-4 h-4" />
              <span>ดูอันดับในลีดเดอร์บอร์ดเรียลไทม์</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsStarted(false);
                setIsSubmitted(false);
                setUserAnswers({});
                setRevealedSolutions({});
                setSkippedQuestionIds([]);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ทำชุดนี้อีกครั้ง</span>
            </button>
            {availableExams && availableExams.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsStarted(false);
                  setIsSubmitted(false);
                  setUserAnswers({});
                  setRevealedSolutions({});
                  setSkippedQuestionIds([]);
                  setIsPickingExam(true);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-2 text-sm cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>เลือกทำชุดข้อสอบอื่น</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>เฉลยพร้อมคำอธิบายละเอียดทุกข้อ (Step-by-Step Solutions)</span>
            </h3>
            <span className="text-xs text-slate-500">
              ถูก {submittedResult.score} จาก {submittedResult.total} ข้อ
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const ans = submittedResult.answers[String(q.id)];
              const isCorrect = ans?.is_correct;
              const chosen = ans?.chosen ?? -1;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition ${
                    isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        isCorrect ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>ข้อที่ {idx + 1}: {isCorrect ? 'ตอบถูกต้อง (+1 คะแนน)' : 'ตอบไม่ถูกต้อง (0 คะแนน)'}</span>
                    </span>
                    <span className="bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-600 font-medium">
                      {q.topic}
                    </span>
                  </div>

                  <div className="text-base text-slate-900 font-medium my-2">
                    <MathText text={q.question} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs my-3">
                    {q.choices.map((ch, cIdx) => {
                      const isChosen = chosen === cIdx;
                      const isTheCorrectOne = cIdx === q.correct_answer_index;

                      let badgeClass = 'bg-white border-slate-200 text-slate-700';
                      if (isTheCorrectOne) {
                        badgeClass = 'bg-emerald-100/70 border-emerald-400 font-bold text-emerald-950 ring-1 ring-emerald-500';
                      } else if (isChosen && !isTheCorrectOne) {
                        badgeClass = 'bg-rose-100/70 border-rose-300 font-semibold text-rose-950';
                      }

                      return (
                        <div key={cIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${badgeClass}`}>
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isTheCorrectOne
                                ? 'bg-emerald-600 text-white'
                                : isChosen
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {letters[cIdx]}
                          </span>
                          <span className="flex-1">
                            <MathText text={ch} />
                          </span>
                          {isTheCorrectOne && <span className="text-[10px] text-emerald-800 font-bold">✓ คำตอบที่ถูก</span>}
                          {isChosen && !isTheCorrectOne && <span className="text-[10px] text-rose-700 font-bold">คุณตอบข้อนี้</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-indigo-900 flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>คำอธิบายและวิธีคิดอย่างละเอียด:</span>
                      </div>
                      <div className="pl-4 pt-1 border-l-2 border-indigo-200 text-slate-800">
                        <MathText text={q.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: LIVE ACTIVE EXAM QUESTION WITH SIDE QUESTION NAVIGATOR
  // -------------------------------------------------------------
  const currentQ = questions[currentIdx];
  const chosenChoice = userAnswers[currentQ?.id];
  const isAnswered = chosenChoice !== undefined;
  const isSkipped = skippedQuestionIds.includes(currentQ?.id);
  const isRevealed = revealedSolutions[currentQ?.id];

  // Progress metrics
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredIndices = getUnansweredIndices();
  const remainingCount = unansweredIndices.length;
  const allQuestionsAnswered = remainingCount === 0;

  return (
    <div className="max-w-7xl mx-auto my-3 space-y-4">
      {/* Top Sticky Bar: Student info & Timer */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 sticky top-2 z-30 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-full border border-indigo-200">
            👤 ผู้เข้าสอบ: {studentName}
          </span>
          <span className="text-xs text-slate-600 font-medium">
            ตอบเสร็จแล้ว <b className="text-emerald-700">{answeredCount}</b> จาก {questions.length} ข้อ
          </span>
          {remainingCount > 0 ? (
            <span className="text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>ยังเหลืออีก {remainingCount} ข้อ</span>
            </span>
          ) : (
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตอบครบทุกข้อแล้ว พร้อมส่งได้ทันที</span>
            </span>
          )}
        </div>

        {/* Right side: Mode indicator & Real-time Timer */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Timing Mode Dropdown/Switcher */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <span className="text-slate-500 font-medium hidden sm:inline">การเฉลย:</span>
            <select
              value={explanationTiming}
              onChange={(e) => {
                const newTiming = e.target.value as ExplanationTiming;
                setExplanationTiming(newTiming);
                if (newTiming === 'immediate_auto' && isAnswered) {
                  setRevealedSolutions((prev) => ({ ...prev, [currentQ.id]: true }));
                }
              }}
              className="bg-transparent font-semibold text-indigo-700 outline-none cursor-pointer text-xs"
              title="สามารถเปลี่ยนช่วงเวลาการขอเฉลยได้ตลอดเวลา"
            >
              <option value="on_submit">📋 ดูเฉลยหลังส่งข้อสอบ</option>
              <option value="instant">💡 กดดูเฉลยทีละข้อ</option>
              <option value="immediate_auto">⚡ เปิดเฉลยอัตโนมัติทันที</option>
            </select>
          </div>

          {/* Real-time Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-bold text-sm border ${
              remainingSeconds < 120
                ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout:
          Column 1: Main Question Card (lg:col-span-8)
          Column 2: Side Question Navigator (lg:col-span-4)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Question Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Looped question alert notification */}
          {isSkipped && !isAnswered && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-2 text-xs text-amber-900 shadow-2xs">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <b>ข้อนี้เคยถูกข้ามไว้:</b> ระบบได้วนกลับมาให้คุณทำข้อนี้ให้เสร็จสมบูรณ์
              </span>
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-indigo-700">
                  ข้อที่ {currentIdx + 1} จาก {questions.length}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                  {currentQ.topic || 'ทั่วไป'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isAnswered ? (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ทำเสร็จแล้ว
                  </span>
                ) : isSkipped ? (
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    ข้ามไว้
                  </span>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2.5 py-1 rounded-full">
                    ยังไม่ทำ
                  </span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div className="text-lg sm:text-xl font-medium text-slate-800 leading-relaxed min-h-[55px]">
              <MathText text={currentQ.question} />
            </div>

            {/* 4 Choices */}
            <div className="space-y-3">
              {currentQ.choices.map((choiceText, cIdx) => {
                const isSelected = chosenChoice === cIdx;
                return (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => handleSelectChoice(currentQ.id, cIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-3.5 text-sm sm:text-base ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-950 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {letters[cIdx]}
                    </span>
                    <span className="flex-1">
                      <MathText text={choiceText} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation Section based on user selection */}
            {(explanationTiming === 'instant' || explanationTiming === 'immediate_auto') && isAnswered && (
              <div className="pt-2 border-t border-slate-100">
                {explanationTiming === 'instant' && !isRevealed ? (
                  <button
                    type="button"
                    onClick={() => handleToggleReveal(currentQ.id)}
                    className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>💡 กดดูเฉลยและคำอธิบายอย่างละเอียดทันที (คลิกเพื่อแสดงผลเฉลย)</span>
                  </button>
                ) : (
                  <div className="bg-gradient-to-br from-amber-50/70 to-indigo-50/40 p-4 rounded-xl border border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>ผลเฉลยและคำอธิบายอย่างละเอียด:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleReveal(currentQ.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded bg-white/70 border border-slate-200 cursor-pointer"
                      >
                        {isRevealed || explanationTiming === 'immediate_auto' ? 'ซ่อนเฉลย ▲' : 'แสดงเฉลย ▼'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                      <span className="font-medium text-slate-600">คำตอบที่ถูกต้องคือ:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">
                        ข้อ {letters[currentQ.correct_answer_index]}
                      </span>
                      <span className="font-semibold text-emerald-900">
                        <MathText text={currentQ.choices[currentQ.correct_answer_index]} />
                      </span>
                      {chosenChoice === currentQ.correct_answer_index ? (
                        <span className="text-xs text-emerald-700 font-bold ml-auto flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> คุณตอบถูกต้อง!
                        </span>
                      ) : (
                        <span className="text-xs text-rose-600 font-bold ml-auto">
                          คุณตอบข้อ {letters[chosenChoice]} (ยังไม่ถูกต้อง)
                        </span>
                      )}
                    </div>

                    {currentQ.explanation && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-indigo-900 block mb-1">📖 วิธีคิด / คำอธิบาย:</span>
                        <div className="pl-3 border-l-2 border-indigo-300 text-slate-800">
                          <MathText text={currentQ.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* In on_submit mode, when answered, show reassuring confirmation with option to view */}
            {explanationTiming === 'on_submit' && isAnswered && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>บันทึกคำตอบแล้ว • ระบบจะแสดงเฉลยละเอียดทุกข้อพร้อมกันเมื่อกดส่งข้อสอบ</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExplanationTiming('instant');
                    handleToggleReveal(currentQ.id);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 ml-auto cursor-pointer"
                >
                  อยากดูเฉลยข้อนี้เลย?
                </button>
              </div>
            )}

            {/* Action Bottom Bar */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ข้อย้อนหลัง</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Requirement: "-ฝั่งนักเรียนมีปุ่มสามารถข้ามไปทำข้ออื่นก่อนได้ โดยที่ข้อที่ข้ามไปจะกลับวนมาใหม่เมื่อทำแต่ละข้อหมดแล้ว" */}
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                  title="บันทึกข้อนี้ว่าข้ามไว้ แล้วกระโดดไปทำข้ออื่นก่อน"
                >
                  <SkipForward className="w-4 h-4 text-amber-700" />
                  <span>ข้ามไปทำข้ออื่นก่อน ⏭️</span>
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <span>ข้อถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className={`px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                      allQuestionsAnswered
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {allQuestionsAnswered
                        ? 'ส่งข้อสอบ (ตอบครบแล้ว)'
                        : `ส่งข้อสอบ (ยังเหลืออีก ${remainingCount} ข้อ)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Requirement:
            "สามารถเลือกข้อที่จะไปได้ข้างๆแบบมีเลขข้อทั้งหมด ยังไมทำเป็นตัวเลขที่มีวงสีเทา ข้อที่ข้ามตัวเลขนั้นจะมีวงกลมสีเหลืองส้ม ข้อที่ทำเสร็จแล้วจะเป็นสีเขียว"
        */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center justify-between">
                <span>📋 เลือกข้อที่จะทำ (เลขข้อทั้งหมด)</span>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {answeredCount}/{questions.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่ตัวเลขเพื่อเปลี่ยนไปยังข้อนั้นได้ทันที
              </p>
            </div>

            {/* Requirement: Explicit Color Legend as requested */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="font-bold text-slate-700 mb-1 text-[11px] uppercase tracking-wider">
                ความหมายของสีสัญลักษณ์:
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  ✓
                </span>
                <span><b>สีเขียว</b>: ข้อที่ทำเสร็จแล้ว</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-500 text-amber-950 font-bold flex items-center justify-center text-[10px] shrink-0">
                  !
                </span>
                <span><b>วงกลมสีเหลืองส้ม</b>: ข้อที่ข้าม</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                  -
                </span>
                <span><b>วงสีเทา</b>: ยังไม่ทำ</span>
              </div>
            </div>

            {/* Circular Question Numbers Grid */}
            <div className="grid grid-cols-5 gap-2.5 pt-1">
              {questions.map((q, idx) => {
                const isCompleted = userAnswers[q.id] !== undefined;
                const isSkippedNow = skippedQuestionIds.includes(q.id) && !isCompleted;
                const isCurrent = idx === currentIdx;

                // Exact color logic requested by user:
                // - ยังไมทำเป็นตัวเลขที่มีวงสีเทา
                // - ข้อที่ข้ามตัวเลขนั้นจะมีวงกลมสีเหลืองส้ม
                // - ข้อที่ทำเสร็จแล้วจะเป็นสีเขียว
                let circleClass = '';

                if (isCompleted) {
                  // ข้อที่ทำเสร็จแล้วจะเป็นสีเขียว
                  circleClass =
                    'bg-emerald-500 border-2 border-emerald-600 text-white font-black shadow-xs hover:bg-emerald-600';
                } else if (isSkippedNow) {
                  // ข้อที่ข้ามตัวเลขนั้นจะมีวงกลมสีเหลืองส้ม
                  circleClass =
                    'bg-amber-400 border-2 border-amber-500 text-amber-950 font-black shadow-xs hover:bg-amber-500 animate-pulse';
                } else {
                  // ยังไมทำเป็นตัวเลขที่มีวงสีเทา
                  circleClass =
                    'bg-slate-100 border-2 border-slate-300 text-slate-600 font-bold shadow-2xs hover:bg-slate-200 hover:border-slate-400';
                }

                // Active indicator for the currently viewed question
                if (isCurrent) {
                  circleClass += ' ring-4 ring-indigo-500 ring-offset-2 ring-offset-white scale-110 z-10 transition-all';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm transition cursor-pointer mx-auto ${circleClass}`}
                    title={`ข้อที่ ${idx + 1} (${
                      isCompleted ? 'ทำเสร็จแล้ว' : isSkippedNow ? 'ข้ามไว้' : 'ยังไม่ทำ'
                    })`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Requirement: Enforcing completion */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {!allQuestionsAnswered ? (
                <>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <b>บังคับตอบให้ครบ:</b> ยังมีข้อที่ยังไม่ได้ทำหรือข้ามไว้ {remainingCount} ข้อ (กรุณาตอบให้ครบจึงจะส่งข้อสอบได้)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (unansweredIndices.length > 0) {
                        setCurrentIdx(unansweredIndices[0]);
                      }
                    }}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition flex items-center justify-center gap-1.5"
                  >
                    <span>⚡ ไปยังข้อที่ยังไม่ทำทันที (ข้อที่ {unansweredIndices[0] + 1})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>คุณตอบครบทั้ง {questions.length} ข้อเรียบร้อยแล้ว</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>ส่งข้อสอบเพื่อตรวจคะแนน</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Completion Enforcing Modal:
          "ถ้านักเรียนข้ามข้อ สุดท้ายต้องบังคับให้ตอบให้ครบ"
      */}
      {showIncompleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-800 text-lg">
                ต้องตอบข้อสอบให้ครบทุกข้อก่อนส่ง!
              </h3>
              <p className="text-xs text-slate-500">
                ระบบตรวจพบว่าคุณยังมีข้อที่ยังไม่ได้ทำหรือข้ามไว้จำนวน{' '}
                <b className="text-amber-700 font-bold">{unansweredIndices.length} ข้อ</b>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                คลิกเลือกข้อที่ยังไม่เสร็จเพื่อไปทำทันที:
              </span>
              <div className="flex flex-wrap gap-2">
                {unansweredIndices.map((uIdx) => {
                  const q = questions[uIdx];
                  const isSkippedNow = skippedQuestionIds.includes(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIdx(uIdx);
                        setShowIncompleteModal(false);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition ${
                        isSkippedNow
                          ? 'bg-amber-400 border-2 border-amber-500 text-amber-950 hover:bg-amber-500'
                          : 'bg-slate-100 border-2 border-slate-300 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {uIdx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (unansweredIndices.length > 0) {
                    setCurrentIdx(unansweredIndices[0]);
                  }
                  setShowIncompleteModal(false);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>ไปทำข้อที่ {unansweredIndices[0] + 1} ทันที</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
