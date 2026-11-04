import { allWords, lessons, units, wordById } from '../data/curriculum'
import type { Lesson, Word } from '../data/types'
import type { AppState } from './store'

export type LessonStatus = 'done' | 'current' | 'locked'

export function currentLessonIndex(s: Pick<AppState, 'lessons'>): number {
  const i = lessons.findIndex((l) => !s.lessons[l.id])
  return i === -1 ? lessons.length : i
}

export function lessonStatus(s: Pick<AppState, 'lessons'>, lesson: Lesson): LessonStatus {
  if (s.lessons[lesson.id]) return 'done'
  const idx = lessons.indexOf(lesson)
  return idx === currentLessonIndex(s) ? 'current' : 'locked'
}

export function isUnlocked(s: Pick<AppState, 'lessons'>, lessonId: string): boolean {
  const idx = lessons.findIndex((l) => l.id === lessonId)
  return idx !== -1 && idx <= currentLessonIndex(s)
}

export function unitProgress(s: Pick<AppState, 'lessons'>, unitId: string) {
  const ls = lessons.filter((l) => l.unitId === unitId)
  const done = ls.filter((l) => s.lessons[l.id]).length
  return { done, total: ls.length, ratio: ls.length ? done / ls.length : 0 }
}

export function learnedWords(s: Pick<AppState, 'words'>): Word[] {
  return allWords.filter((w) => (s.words[w.id]?.correct ?? 0) > 0 || s.words[w.id])
}

export function dueWords(s: Pick<AppState, 'words'>): Word[] {
  const now = Date.now()
  return Object.entries(s.words)
    .filter(([, p]) => p.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => wordById.get(id))
    .filter((w): w is Word => !!w)
}

export function weakWords(s: Pick<AppState, 'words'>): Word[] {
  return Object.entries(s.words)
    .filter(([, p]) => p.wrong > 0)
    .sort((a, b) => b[1].wrong / (b[1].correct + 1) - a[1].wrong / (a[1].correct + 1))
    .map(([id]) => wordById.get(id))
    .filter((w): w is Word => !!w)
}

export function wordsBeforeLesson(lesson: Lesson): Word[] {
  const idx = lessons.indexOf(lesson)
  const ids = new Set<string>()
  for (const l of lessons.slice(0, idx)) l.newWordIds.forEach((id) => ids.add(id))
  return [...ids].map((id) => wordById.get(id)!).filter(Boolean)
}

export function currentUnit(s: Pick<AppState, 'lessons'>) {
  const idx = currentLessonIndex(s)
  const l = lessons[Math.min(idx, lessons.length - 1)]
  return units.find((u) => u.id === l.unitId)!
}
