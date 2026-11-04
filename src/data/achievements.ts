import type { AppState } from '../lib/store'

export type Achievement = {
  id: string
  title: string
  desc: string
  icon: string
  check: (s: AppState) => boolean
}

const learnedWords = (s: AppState) => Object.values(s.words).filter((w) => w.correct > 0).length

export const achievements: Achievement[] = [
  { id: 'first-lesson', title: 'Первый шаг', desc: 'Пройди первый урок', icon: '🌱', check: (s) => s.stats.lessonsCompleted >= 1 },
  { id: 'perfect', title: 'Без ошибок', desc: 'Пройди урок без единой ошибки', icon: '💎', check: (s) => s.stats.perfectLessons >= 1 },
  { id: 'streak-3', title: 'Разгорается', desc: 'Серия 3 дня подряд', icon: '🔥', check: (s) => s.bestStreak >= 3 },
  { id: 'streak-7', title: 'Неделя огня', desc: 'Серия 7 дней подряд', icon: '🐉', check: (s) => s.bestStreak >= 7 },
  { id: 'words-25', title: 'Словарный запас', desc: 'Выучи 25 слов', icon: '📗', check: (s) => learnedWords(s) >= 25 },
  { id: 'words-100', title: 'Сотня', desc: 'Выучи 100 слов', icon: '🏮', check: (s) => learnedWords(s) >= 100 },
  { id: 'xp-500', title: 'Трудяга', desc: 'Набери 500 XP', icon: '⚡', check: (s) => s.xp >= 500 },
  { id: 'xp-2000', title: 'Мастер', desc: 'Набери 2000 XP', icon: '🏆', check: (s) => s.xp >= 2000 },
  { id: 'writer', title: 'Каллиграф', desc: 'Напиши 20 иероглифов', icon: '🖌️', check: (s) => s.stats.charsWritten >= 20 },
  { id: 'unit-1', title: 'Юнит пройден', desc: 'Пройди испытание любого юнита', icon: '🎖️', check: (s) => Object.keys(s.lessons).some((id) => id.endsWith('-test')) },
  { id: 'goal', title: 'Цель дня', desc: 'Выполни дневную цель', icon: '🎯', check: (s) => Object.values(s.xpByDay).some((x) => x >= s.dailyGoal) },
  { id: 'tones', title: 'Слух на тоны', desc: 'Ответь верно на 20 вопросов о тонах', icon: '🎵', check: (s) => s.stats.tonesCorrect >= 20 },
]
