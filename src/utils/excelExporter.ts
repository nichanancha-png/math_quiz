import * as XLSX from 'xlsx';
import { CentralTendencyStats, ItemAnalysis, Question, StudentSubmission } from '../types';

export function exportScoresToExcel(
  submissions: StudentSubmission[],
  questions: Question[],
  stats: CentralTendencyStats,
  itemAnalysis: ItemAnalysis[],
  quizTitle: string
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: ผลคะแนนรายบุคคลและอันดับ
  const choiceLetters = ['A', 'B', 'C', 'D'];
  const sortedSubs = [...submissions].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);

  const studentRows = sortedSubs.map((sub, idx) => {
    const row: Record<string, string | number> = {
      'อันดับ (Rank)': idx + 1,
      'ชื่อ-นามสกุล': sub.student_name,
      'คะแนนที่ได้': sub.score,
      'คะแนนเต็ม': sub.total,
      'ร้อยละ (%)': sub.percentage,
      'ผลการประเมิน': sub.percentage >= 50 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์',
      'เวลาที่ใช้ (นาที)': `${Math.floor(sub.time_taken_seconds / 60)} นาที ${sub.time_taken_seconds % 60} วินาที`,
      'วันเวลาที่ส่ง': sub.submitted_at,
    };

    questions.forEach((q, qIdx) => {
      const ans = sub.answers[String(q.id)];
      if (ans && ans.chosen >= 0) {
        const letter = choiceLetters[ans.chosen] || '-';
        const mark = ans.is_correct ? '✓' : '✗';
        row[`ข้อ ${qIdx + 1} (${q.topic || 'ทั่วไป'})`] = `${letter} (${mark})`;
      } else {
        row[`ข้อ ${qIdx + 1} (${q.topic || 'ทั่วไป'})`] = 'ไม่ตอบ';
      }
    });

    return row;
  });

  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'คะแนนและอันดับนักเรียน');

  // 2. Sheet 2: สถิติค่ากลางและภาพรวม
  const statsRows = [
    { 'ตัวชี้วัดสถิติ': 'ชื่อชุดข้อสอบ', 'ค่าสถิติ': quizTitle },
    { 'ตัวชี้วัดสถิติ': 'จำนวนผู้สอบทั้งหมด (N)', 'ค่าสถิติ': stats.total_students },
    { 'ตัวชี้วัดสถิติ': 'คะแนนเต็มทั้งหมด', 'ค่าสถิติ': questions.length },
    { 'ตัวชี้วัดสถิติ': 'ค่าเฉลี่ยเลขคณิต (Mean)', 'ค่าสถิติ': stats.mean },
    { 'ตัวชี้วัดสถิติ': 'มัธยฐาน (Median)', 'ค่าสถิติ': stats.median },
    { 'ตัวชี้วัดสถิติ': 'ฐานนิยม (Mode)', 'ค่าสถิติ': stats.mode.length > 0 ? stats.mode.join(', ') : 'ไม่มีฐานนิยมเด่นชัด' },
    { 'ตัวชี้วัดสถิติ': 'ส่วนเบี่ยงเบนมาตรฐาน (S.D.)', 'ค่าสถิติ': stats.sd },
    { 'ตัวชี้วัดสถิติ': 'คะแนนสูงสุด (Max Score)', 'ค่าสถิติ': stats.max },
    { 'ตัวชี้วัดสถิติ': 'คะแนนต่ำสุด (Min Score)', 'ค่าสถิติ': stats.min },
    { 'ตัวชี้วัดสถิติ': 'อัตราการสอบผ่าน (Pass Rate ≥ 50%)', 'ค่าสถิติ': `${stats.pass_rate}%` },
    { 'ตัวชี้วัดสถิติ': '--- แยกตามหมวดหมู่ / Topic ---', 'ค่าสถิติ': '' },
  ];

  Object.values(stats.topic_stats).forEach((ts) => {
    statsRows.push({
      'ตัวชี้วัดสถิติ': `หมวด: ${ts.topic} (${ts.total_questions} ข้อ)`,
      'ค่าสถิติ': `เฉลี่ย ${ts.mean_score}/${ts.total_questions} (${ts.percentage}%)`,
    });
  });

  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, wsStats, 'สถิติค่ากลางและภาพรวม');

  // 3. Sheet 3: วิเคราะห์รายข้อ (Item Analysis)
  const itemRows = itemAnalysis.map((item, idx) => ({
    'ลำดับความยาก (ตอบผิดมากสุด)': idx + 1,
    'ข้อที่': item.id,
    'หมวดหมู่ (Topic)': item.topic,
    'คำถาม': item.question.replace(/\$/g, ''),
    'คำตอบที่ถูกต้อง': choiceLetters[item.correct_answer_index] || 'A',
    'จำนวนผู้ตอบผิด (คน)': item.wrong_count,
    'จำนวนผู้ตอบทั้งหมด (คน)': item.total_answered,
    'อัตราตอบผิด (% Error)': `${item.error_rate}%`,
    'เลือก A (คน)': item.choice_counts[0],
    'เลือก B (คน)': item.choice_counts[1],
    'เลือก C (คน)': item.choice_counts[2],
    'เลือก D (คน)': item.choice_counts[3],
  }));

  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'การวิเคราะห์รายข้อ');

  // Trigger Excel file download
  const filename = `MathQuiz_ScoreReport_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportScoresToCsv(
  submissions: StudentSubmission[],
  questions: Question[]
) {
  const choiceLetters = ['A', 'B', 'C', 'D'];
  const headers = ['ชื่อ-นามสกุล', 'คะแนนที่ได้', 'คะแนนเต็ม', 'ร้อยละ (%)', 'ผลประเมิน', 'เวลาที่ใช้(วินาที)', 'เวลาส่ง'];
  questions.forEach((q, idx) => {
    headers.push(`ข้อ ${idx + 1} (${q.topic || 'ทั่วไป'})`);
  });

  const rows = submissions.map((sub) => {
    const r = [
      `"${sub.student_name.replace(/"/g, '""')}"`,
      sub.score,
      sub.total,
      sub.percentage,
      sub.percentage >= 50 ? 'ผ่าน' : 'ไม่ผ่าน',
      sub.time_taken_seconds,
      `"${sub.submitted_at}"`,
    ];

    questions.forEach((q) => {
      const ans = sub.answers[String(q.id)];
      if (ans && ans.chosen >= 0) {
        const letter = choiceLetters[ans.chosen] || '-';
        const mark = ans.is_correct ? '✓' : '✗';
        r.push(`"${letter} (${mark})"`);
      } else {
        r.push('"ไม่ตอบ"');
      }
    });

    return r.join(',');
  });

  // Add UTF-8 BOM so Excel opens Thai language correctly
  const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MathQuiz_Scores_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
