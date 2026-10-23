import { CentralTendencyStats, ItemAnalysis, Question, StudentSubmission } from '../types';

export function calculateCentralTendency(
  submissions: StudentSubmission[],
  totalQuestions: number,
  questions: Question[]
): CentralTendencyStats {
  const n = submissions.length;
  if (n === 0) {
    return {
      mean: 0,
      median: 0,
      mode: [],
      sd: 0,
      min: 0,
      max: 0,
      pass_rate: 0,
      total_students: 0,
      topic_stats: {},
    };
  }

  const scores = submissions.map((s) => s.score).sort((a, b) => a - b);

  // 1. Mean (ค่าเฉลี่ยเลขคณิต)
  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  const mean = Math.round((sum / n) * 100) / 100;

  // 2. Median (มัธยฐาน)
  let median = 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 0) {
    median = Math.round(((scores[mid - 1] + scores[mid]) / 2) * 100) / 100;
  } else {
    median = scores[mid];
  }

  // 3. Mode (ฐานนิยม)
  const freqMap: Record<number, number> = {};
  scores.forEach((s) => {
    freqMap[s] = (freqMap[s] || 0) + 1;
  });
  let maxFreq = 0;
  Object.values(freqMap).forEach((count) => {
    if (count > maxFreq) maxFreq = count;
  });

  const mode: number[] = [];
  // Only consider mode if maxFreq > 1 and not all numbers have the same frequency
  const uniqueKeys = Object.keys(freqMap);
  const allSameFreq = uniqueKeys.every((k) => freqMap[Number(k)] === maxFreq);

  if (maxFreq > 1 && !allSameFreq) {
    uniqueKeys.forEach((k) => {
      const num = Number(k);
      if (freqMap[num] === maxFreq) {
        mode.push(num);
      }
    });
    mode.sort((a, b) => a - b);
  } else if (maxFreq > 1 && allSameFreq && uniqueKeys.length === 1) {
    mode.push(Number(uniqueKeys[0]));
  }

  // 4. Standard Deviation (ส่วนเบี่ยงเบนมาตรฐาน S.D.)
  let sd = 0;
  if (n > 1) {
    const variance =
      scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / (n - 1);
    sd = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  // 5. Min & Max
  const min = scores[0];
  const max = scores[n - 1];

  // 6. Pass Rate (เกณฑ์ผ่าน >= 50%)
  const passCount = scores.filter((s) => s >= Math.ceil(totalQuestions / 2)).length;
  const pass_rate = Math.round((passCount / n) * 1000) / 10;

  // 7. Topic Breakdown
  const topicStats: CentralTendencyStats['topic_stats'] = {};
  const topicTotalQ: Record<string, number> = {};
  questions.forEach((q) => {
    const t = q.topic || 'ทั่วไป';
    topicTotalQ[t] = (topicTotalQ[t] || 0) + 1;
  });

  Object.keys(topicTotalQ).forEach((topic) => {
    const topicQuestions = questions.filter((q) => (q.topic || 'ทั่วไป') === topic);
    const qIds = topicQuestions.map((q) => String(q.id));

    let topicScoreSum = 0;
    submissions.forEach((sub) => {
      qIds.forEach((qId) => {
        if (sub.answers[qId]?.is_correct) {
          topicScoreSum += 1;
        }
      });
    });

    const totalTopicQ = topicTotalQ[topic];
    const meanScore = Math.round((topicScoreSum / n) * 100) / 100;
    const percentage = totalTopicQ > 0 ? Math.round((meanScore / totalTopicQ) * 1000) / 10 : 0;

    topicStats[topic] = {
      topic,
      total_questions: totalTopicQ,
      mean_score: meanScore,
      percentage,
    };
  });

  return {
    mean,
    median,
    mode,
    sd,
    min,
    max,
    pass_rate,
    total_students: n,
    topic_stats: topicStats,
  };
}

export function calculateItemAnalysis(
  questions: Question[],
  submissions: StudentSubmission[]
): ItemAnalysis[] {
  const qStatsMap: Record<number, ItemAnalysis> = {};

  questions.forEach((q) => {
    qStatsMap[q.id] = {
      id: q.id,
      topic: q.topic || 'ทั่วไป',
      question: q.question,
      choices: q.choices,
      correct_answer_index: q.correct_answer_index,
      wrong_count: 0,
      total_answered: 0,
      error_rate: 0,
      choice_counts: [0, 0, 0, 0],
    };
  });

  submissions.forEach((sub) => {
    Object.entries(sub.answers).forEach(([qIdStr, ans]) => {
      const qId = Number(qIdStr);
      const stat = qStatsMap[qId];
      if (stat) {
        stat.total_answered += 1;
        if (ans.chosen >= 0 && ans.chosen < 4) {
          stat.choice_counts[ans.chosen] = (stat.choice_counts[ans.chosen] || 0) + 1;
        }
        if (!ans.is_correct) {
          stat.wrong_count += 1;
        }
      }
    });
  });

  const result = Object.values(qStatsMap).map((stat) => {
    const error_rate =
      stat.total_answered > 0
        ? Math.round((stat.wrong_count / stat.total_answered) * 1000) / 10
        : 0;
    return {
      ...stat,
      error_rate,
    };
  });

  return result.sort((a, b) => b.error_rate - a.error_rate);
}
