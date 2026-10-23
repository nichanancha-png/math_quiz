import React, { useState } from 'react';
import { Trophy, Medal, Award, Clock, Search, ArrowUpDown, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { CentralTendencyStats, ExamSet, Question, StudentSubmission } from '../types';
import { MathText } from '../utils/mathRenderer';

interface RealtimeLeaderboardProps {
  submissions: StudentSubmission[];
  questions: Question[];
  stats: CentralTendencyStats;
  currentStudentName?: string;
  exams?: ExamSet[];
  selectedExamId?: string;
  onSelectExam?: (id: string) => void;
}

export const RealtimeLeaderboard: React.FC<RealtimeLeaderboardProps> = ({
  submissions,
  questions,
  stats,
  currentStudentName,
  exams,
  selectedExamId,
  onSelectExam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);

  // Sort and rank submissions
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (sortBy === 'score') {
      if (b.score !== a.score) {
        return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
      }
      return a.time_taken_seconds - b.time_taken_seconds;
    } else if (sortBy === 'time') {
      return sortOrder === 'desc'
        ? b.time_taken_seconds - a.time_taken_seconds
        : a.time_taken_seconds - b.time_taken_seconds;
    } else {
      return sortOrder === 'desc'
        ? b.student_name.localeCompare(a.student_name, 'th')
        : a.student_name.localeCompare(b.student_name, 'th');
    }
  });

  const filteredSubmissions = sortedSubmissions.filter((s) =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topThree = sortedSubmissions.slice(0, 3);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}น. ${s}วิ.`;
  };

  const getTier = (percentage: number) => {
    if (percentage === 100) {
      return { label: 'ระดับยอดเยี่ยม (Gold)', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    } else if (percentage >= 80) {
      return { label: 'ระดับดีเยี่ยม (Silver)', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    } else if (percentage >= 50) {
      return { label: 'ผ่านเกณฑ์ (Pass)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { label: 'กำลังพัฒนา (Review)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with live badge */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight">ลีดเดอร์บอร์ดจัดอันดับผู้สอบ (Real-Time Leaderboard)</h2>
          </div>
          <p className="text-sm text-indigo-200">
            ระบบจัดอันดับคะแนนและระยะเวลาการสอบแบบเรียลไทม์ พร้อมคำนวณค่ากลางเปรียบเทียบในชั้นเรียน
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/50 px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
          <span>● สตรีมข้อมูลสดทันทีเมื่อส่งข้อสอบ</span>
        </div>
      </div>

      {/* Exam Set Filter */}
      {exams && exams.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">เลือกดูชุดข้อสอบ:</span>
            <select
              value={selectedExamId || 'all'}
              onChange={(e) => onSelectExam && onSelectExam(e.target.value)}
              className="text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 max-w-sm truncate"
            >
              <option value="all">📊 ทุกชุดข้อสอบ (รวมทั้งหมด)</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.is_published ? '🟢' : '🟡'} {ex.title}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            แสดง {filteredSubmissions.length} รายชื่อ
          </span>
        </div>
      )}

      {/* Mini Central Tendency Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">ผู้เข้าร่วมสอบทั้งหมด</span>
          <div className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total_students} คน</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">คะแนนเฉลี่ย (Mean)</span>
          <div className="text-2xl font-bold text-indigo-600 mt-0.5">{stats.mean} / {questions.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">มัธยฐาน (Median)</span>
          <div className="text-2xl font-bold text-slate-800 mt-0.5">{stats.median} คะแนน</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">ฐานนิยม (Mode)</span>
          <div className="text-2xl font-bold text-slate-800 mt-0.5">
            {stats.mode.length > 0 ? stats.mode.join(', ') : '-'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-500 block">อัตราการผ่าน (≥50%)</span>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.pass_rate}%</div>
        </div>
      </div>

      {/* Podium Top 3 */}
      {topThree.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span>🏆 ผู้ทำคะแนนสูงสุด 3 อันดับแรก (Top Performers)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="order-2 md:order-1 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg mb-2 shadow-2xs">
                  🥈 2
                </div>
                <div className="font-bold text-slate-800 text-sm truncate max-w-full">{topThree[1].student_name}</div>
                <div className="text-lg font-extrabold text-slate-700 mt-1">
                  {topThree[1].score} / {topThree[1].total} ({topThree[1].percentage}%)
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(topThree[1].time_taken_seconds)}</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-amber-100/60 p-5 rounded-xl border-2 border-amber-300 text-center flex flex-col items-center transform -translate-y-1 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-extrabold text-2xl mb-2 shadow">
                  🥇
                </div>
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">แชมป์อันดับ 1</div>
                <div className="font-extrabold text-slate-900 text-base mt-0.5 truncate max-w-full">
                  {topThree[0].student_name}
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {topThree[0].score} / {topThree[0].total} ({topThree[0].percentage}%)
                </div>
                <div className="text-xs text-amber-800 flex items-center gap-1 mt-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>เวลา {formatTime(topThree[0].time_taken_seconds)}</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="order-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg mb-2 shadow-2xs">
                  🥉 3
                </div>
                <div className="font-bold text-slate-800 text-sm truncate max-w-full">{topThree[2].student_name}</div>
                <div className="text-lg font-extrabold text-amber-900 mt-1">
                  {topThree[2].score} / {topThree[2].total} ({topThree[2].percentage}%)
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(topThree[2].time_taken_seconds)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อนักเรียน หรือรหัส..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> เรียงตาม:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none"
          >
            <option value="score">คะแนนสูงสุด (Score)</option>
            <option value="time">เวลาที่ใช้ (Time)</option>
            <option value="name">ชื่อนักเรียน (Name)</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
          >
            {sortOrder === 'desc' ? '⬇ มากไปน้อย' : '⬆ น้อยไปมาก'}
          </button>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-16 text-center">อันดับ</th>
                <th className="px-4 py-3.5">ผู้เข้าสอบ</th>
                <th className="px-4 py-3.5 text-center">ระดับผลงาน</th>
                <th className="px-4 py-3.5 text-center">คะแนนที่ได้</th>
                <th className="px-4 py-3.5 text-center">เวลาที่ใช้</th>
                <th className="px-4 py-3.5 text-center">ส่งเมื่อ</th>
                <th className="px-4 py-3.5 text-center">ดูคำตอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    ไม่พบข้อมูลผู้เข้าสอบที่ตรงกับคำค้นหา
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, index) => {
                  const isCurrent = currentStudentName && sub.student_name.includes(currentStudentName);
                  const tier = getTier(sub.percentage);

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isCurrent ? 'bg-indigo-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                            🥇
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-sm">
                            🥈
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-sm">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">{index + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800">{sub.student_name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                              คุณ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium inline-block ${tier.bg}`}
                        >
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-slate-800 text-base">
                            {sub.score} / {sub.total}
                          </span>
                          <span className="text-xs text-slate-500">({sub.percentage}%)</span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full ${
                                sub.percentage >= 80
                                  ? 'bg-indigo-600'
                                  : sub.percentage >= 50
                                  ? 'bg-emerald-500'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${sub.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-600 font-mono">
                        {formatTime(sub.time_taken_seconds)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {sub.submitted_at.slice(11)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(sub)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          title="ดูรายละเอียดข้อที่ถูก/ผิด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Details Inspection Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedStudent.student_name}</h3>
                <p className="text-xs text-slate-500">
                  ได้คะแนน {selectedStudent.score}/{selectedStudent.total} ({selectedStudent.percentage}%) • ใช้เวลา {formatTime(selectedStudent.time_taken_seconds)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const ans = selectedStudent.answers[String(q.id)];
                const isCorrect = ans?.is_correct;
                const chosenLetter = ans && ans.chosen >= 0 ? ['A', 'B', 'C', 'D'][ans.chosen] : 'ไม่ได้ตอบ';
                const correctLetter = ['A', 'B', 'C', 'D'][q.correct_answer_index];

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                      isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold mb-1">
                      <span className={isCorrect ? 'text-emerald-800' : 'text-rose-800'}>
                        ข้อ {idx + 1}: {isCorrect ? '✓ ตอบถูก' : '✗ ตอบผิด'}
                      </span>
                      <span className="text-xs font-normal bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                        {q.topic}
                      </span>
                    </div>
                    <div className="text-slate-800 mb-2">
                      <MathText text={q.question} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <span>นักเรียนเลือก: <b>{chosenLetter}</b></span>
                      <span>•</span>
                      <span className="text-emerald-700">เฉลย: <b>{correctLetter}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
