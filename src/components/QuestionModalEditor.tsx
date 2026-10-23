import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Sparkles,
  HelpCircle,
  Eye,
  Plus,
  Save,
} from 'lucide-react';
import { Question } from '../types';
import { MathSymbolPicker } from './MathSymbolPicker';
import { MathText } from '../utils/mathRenderer';

interface QuestionModalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit: Question | null;
  insertIndex?: number;
  totalQuestions: number;
  onSave: (question: Question, insertIndex?: number) => void;
}

export const QuestionModalEditor: React.FC<QuestionModalEditorProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  insertIndex,
  totalQuestions,
  onSave,
}) => {
  const [topic, setTopic] = useState('พีชคณิต');
  const [questionText, setQuestionText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [activeField, setActiveField] = useState<string>('question');
  const [showPreview, setShowPreview] = useState(true);

  // Popular math topics suggestions
  const topicSuggestions = [
    'พีชคณิต',
    'เรขาคณิต',
    'ตรีโกณมิติ',
    'ความน่าจะเป็น',
    'สถิติ',
    'เลขยกกำลัง',
    'ลำดับและอนุกรม',
    'แคลคูลัส',
  ];

  useEffect(() => {
    if (questionToEdit) {
      setTopic(questionToEdit.topic || 'พีชคณิต');
      setQuestionText(questionToEdit.question || '');
      setChoiceA(questionToEdit.choices[0] || '');
      setChoiceB(questionToEdit.choices[1] || '');
      setChoiceC(questionToEdit.choices[2] || '');
      setChoiceD(questionToEdit.choices[3] || '');
      setCorrectIndex(questionToEdit.correct_answer_index ?? 0);
      setExplanation(questionToEdit.explanation || '');
    } else {
      // New Question defaults
      setTopic('พีชคณิต');
      setQuestionText('');
      setChoiceA('');
      setChoiceB('');
      setChoiceC('');
      setChoiceD('');
      setCorrectIndex(0);
      setExplanation('');
    }
  }, [questionToEdit, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      alert('กรุณากรอกคำถาม');
      return;
    }
    if (!choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
      alert('กรุณากรอกตัวเลือกคำตอบให้ครบทั้ง 4 ตัวเลือก (A, B, C, D)');
      return;
    }

    const savedQuestion: Question = {
      id: questionToEdit ? questionToEdit.id : Date.now(),
      topic: topic.trim() || 'ทั่วไป',
      question: questionText.trim(),
      choices: [choiceA.trim(), choiceB.trim(), choiceC.trim(), choiceD.trim()],
      correct_answer_index: correctIndex,
      explanation: explanation.trim(),
    };

    onSave(savedQuestion, insertIndex);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              {questionToEdit ? '✏️' : '➕'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {questionToEdit
                  ? `แก้ไขข้อสอบ (ID: ${questionToEdit.id})`
                  : insertIndex !== undefined
                  ? `เพิ่มข้อสอบใหม่ (แทรกเป็นข้อที่ ${insertIndex + 1})`
                  : `เพิ่มข้อสอบใหม่ (ข้อที่ ${totalQuestions + 1})`}
              </h3>
              <p className="text-xs text-slate-500">
                รองรับการพิมพ์สูตรคณิตศาสตร์ KaTeX เช่น <code className="bg-slate-200 px-1 rounded">$x^2$</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Math Symbol Picker Bar */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>คลิกเพื่อแทรกสัญลักษณ์คณิตศาสตร์ (ลงในช่องที่กำลังพิมพ์):</span>
              </span>
              <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                ตำแหน่งที่เลือก: <b>{activeField}</b>
              </span>
            </div>
            <MathSymbolPicker onInsertSymbol={handleInsertSymbol} />
          </div>

          {/* Topic Selector & Suggestions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              หัวข้อ / สาระการเรียนรู้:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {topicSuggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    topic === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="เช่น พีชคณิต, เรขาคณิต, สถิติ"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm"
              required
            />
          </div>

          {/* Question Textarea with Live KaTeX Preview */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              โจทย์คำถาม <span className="text-rose-500">*</span>:
            </label>
            <textarea
              rows={3}
              value={questionText}
              onFocus={() => setActiveField('question')}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="พิมพ์คำถามที่นี่ เช่น กำหนดให้สมการคือ $x^2 - 5x + 6 = 0$ จงหาค่าของ $x$"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm font-sans"
              required
            />
            {questionText && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800">
                <span className="text-[11px] font-bold text-indigo-700 block mb-1">
                  👁️ ตัวอย่างการแสดงผลโจทย์จริง (KaTeX Render):
                </span>
                <div className="font-medium text-slate-900">
                  <MathText text={questionText} />
                </div>
              </div>
            )}
          </div>

          {/* 4 Choices */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                ตัวเลือกคำตอบ 4 ข้อ (คลิกที่ปุ่มวงกลมเพื่อระบุข้อที่ถูกต้อง) <span className="text-rose-500">*</span>:
              </label>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ข้อที่ถูกปัจจุบัน: ข้อ {['A', 'B', 'C', 'D'][correctIndex]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Choice A */}
              <div
                className={`p-3 rounded-xl border transition ${
                  correctIndex === 0
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="correct_choice_modal"
                    id="choiceA_radio"
                    checked={correctIndex === 0}
                    onChange={() => setCorrectIndex(0)}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="choiceA_radio" className="font-bold text-xs text-slate-700 cursor-pointer flex-1">
                    ตัวเลือก A {correctIndex === 0 && <span className="text-emerald-700 font-bold">(คำตอบที่ถูก ✓)</span>}
                  </label>
                </div>
                <input
                  type="text"
                  value={choiceA}
                  onFocus={() => setActiveField('choiceA')}
                  onChange={(e) => setChoiceA(e.target.value)}
                  placeholder="เช่น $x = 2$ หรือ $x = 3$"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                {choiceA && (
                  <div className="mt-1 text-[11px] text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200">
                    <MathText text={choiceA} />
                  </div>
                )}
              </div>

              {/* Choice B */}
              <div
                className={`p-3 rounded-xl border transition ${
                  correctIndex === 1
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="correct_choice_modal"
                    id="choiceB_radio"
                    checked={correctIndex === 1}
                    onChange={() => setCorrectIndex(1)}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="choiceB_radio" className="font-bold text-xs text-slate-700 cursor-pointer flex-1">
                    ตัวเลือก B {correctIndex === 1 && <span className="text-emerald-700 font-bold">(คำตอบที่ถูก ✓)</span>}
                  </label>
                </div>
                <input
                  type="text"
                  value={choiceB}
                  onFocus={() => setActiveField('choiceB')}
                  onChange={(e) => setChoiceB(e.target.value)}
                  placeholder="เช่น $x = -2$ หรือ $x = -3$"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                {choiceB && (
                  <div className="mt-1 text-[11px] text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200">
                    <MathText text={choiceB} />
                  </div>
                )}
              </div>

              {/* Choice C */}
              <div
                className={`p-3 rounded-xl border transition ${
                  correctIndex === 2
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="correct_choice_modal"
                    id="choiceC_radio"
                    checked={correctIndex === 2}
                    onChange={() => setCorrectIndex(2)}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="choiceC_radio" className="font-bold text-xs text-slate-700 cursor-pointer flex-1">
                    ตัวเลือก C {correctIndex === 2 && <span className="text-emerald-700 font-bold">(คำตอบที่ถูก ✓)</span>}
                  </label>
                </div>
                <input
                  type="text"
                  value={choiceC}
                  onFocus={() => setActiveField('choiceC')}
                  onChange={(e) => setChoiceC(e.target.value)}
                  placeholder="เช่น $x = 1$ หรือ $x = 6$"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                {choiceC && (
                  <div className="mt-1 text-[11px] text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200">
                    <MathText text={choiceC} />
                  </div>
                )}
              </div>

              {/* Choice D */}
              <div
                className={`p-3 rounded-xl border transition ${
                  correctIndex === 3
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="radio"
                    name="correct_choice_modal"
                    id="choiceD_radio"
                    checked={correctIndex === 3}
                    onChange={() => setCorrectIndex(3)}
                    className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="choiceD_radio" className="font-bold text-xs text-slate-700 cursor-pointer flex-1">
                    ตัวเลือก D {correctIndex === 3 && <span className="text-emerald-700 font-bold">(คำตอบที่ถูก ✓)</span>}
                  </label>
                </div>
                <input
                  type="text"
                  value={choiceD}
                  onFocus={() => setActiveField('choiceD')}
                  onChange={(e) => setChoiceD(e.target.value)}
                  placeholder="เช่น $x = 5$ หรือ $x = -6$"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                {choiceD && (
                  <div className="mt-1 text-[11px] text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200">
                    <MathText text={choiceD} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Explanation Textarea with Live KaTeX Preview */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              คำอธิบายเฉลยและวิธีคิดอย่างละเอียด (Detailed Solution):
            </label>
            <textarea
              rows={3}
              value={explanation}
              onFocus={() => setActiveField('explanation')}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="เช่น แยกตัวประกอบได้ $(x - 2)(x - 3) = 0$ ดังนั้น $x = 2$ หรือ $x = 3$"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm font-sans"
            />
            {explanation && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-slate-800">
                <span className="text-[11px] font-bold text-amber-900 block mb-1">
                  💡 พรีวิวคำอธิบายเฉลย:
                </span>
                <div className="pl-3 border-l-2 border-amber-400 text-slate-800">
                  <MathText text={explanation} />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{questionToEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อสอบใหม่'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
