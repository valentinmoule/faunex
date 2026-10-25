import { supabase } from '@/integrations/supabase/client';

export type LearningQuestion = { type: 'mcq' | 'boolean' | 'visual'; prompt: string; prompt_en: string; options: string[]; options_en: string[]; correct?: number; explanation?: string; explanation_en?: string; image?: string; credit?: string };
export type LearningLesson = { id: string; title: string; title_en: string; intro: string; intro_en: string; special?: boolean; questions?: LearningQuestion[] };
export type LearningChapter = { title: string; title_en: string; lessons: LearningLesson[] };
export type LearningPath = { id: string; title: string; title_en: string; chapters: LearningChapter[] };
export type LearningStatus = { paths: LearningPath[]; completed: { path_id: string; lesson_id: string }[]; used: number; limit: number; reset_at: string };
export type LearningAttempt = { id: string; lesson: LearningLesson & { questions: LearningQuestion[] }; answers: number[]; finished: boolean; result: { score: number; total: number; passed: boolean; reward: number; balance_delta: number } | null };
export function learningText(item: { [key: string]: unknown }, key: string, english: boolean): string {
  return String((english && item[`${key}_en`]) || item[key] || '');
}
export async function learningStatus(): Promise<LearningStatus> {
  const { data, error } = await supabase.rpc('learning_status');
  if (error) throw error;
  return data as unknown as LearningStatus;
}
export async function startLesson(path: string, lesson: string): Promise<LearningAttempt> {
  const { data, error } = await supabase.rpc('learning_start', { p_path: path, p_lesson: lesson });
  if (error) throw error;
  return data as unknown as LearningAttempt;
}
export async function answerLesson(attempt: string, index: number, choice: number): Promise<LearningAttempt> {
  const { data, error } = await supabase.rpc('learning_answer', { p_attempt: attempt, p_index: index, p_choice: choice });
  if (error) throw error;
  return data as unknown as LearningAttempt;
}
export async function finishLesson(attempt: string): Promise<LearningAttempt> {
  const { data, error } = await supabase.rpc('learning_finish', { p_attempt: attempt });
  if (error) throw error;
  return data as unknown as LearningAttempt;
}