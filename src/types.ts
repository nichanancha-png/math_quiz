export interface Question {
  id: number;
  topic: string;
  question: string;
  choices: [string, string, string, string] | string[];
  correct_answer_index: number; // 0, 1, 2, 3
  explanation: string;
}

export interface ExamSet {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  is_published: boolean; // Controls whether students can see and take this exam
  created_at: string;
  updated_at: string;
  questions: Question[];
}

export interface QuizData {
  quiz_title: string;
  time_limit_minutes: number;
  questions: Question[];
}

export interface StudentAnswerDetail {
  chosen: number; // 0..3 or -1 if unanswered
  correct: number;
  is_correct: boolean;
  explanation: string;
  topic: string;
}

export interface StudentSubmission {
  id: string;
  exam_id?: string;
  exam_title?: string;
  student_name: string;
  score: number;
  total: number;
  percentage: number;
  time_taken_seconds: number;
  submitted_at: string;
  answers: Record<string, StudentAnswerDetail>;
  rank?: number;
  tab_violations?: number;
}

export interface CentralTendencyStats {
  mean: number;
  median: number;
  mode: number[];
  sd: number;
  min: number;
  max: number;
  pass_rate: number;
  total_students: number;
  topic_stats: Record<
    string,
    {
      topic: string;
      total_questions: number;
      mean_score: number;
      percentage: number;
    }
  >;
}

export interface ItemAnalysis {
  id: number;
  topic: string;
  question: string;
  choices: string[];
  correct_answer_index: number;
  wrong_count: number;
  total_answered: number;
  error_rate: number;
  choice_counts: [number, number, number, number];
}

export type ExplanationTiming = 'on_submit' | 'instant' | 'immediate_auto';
export type SequenceMode = 'blocked' | 'interleaved' | 'random';
export type UserRole = 'student' | 'teacher' | 'dual';
