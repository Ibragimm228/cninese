import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { achievements } from '../data/achievements'
import { addDays, dayKey } from './date'
import { review, type WordProgress } from './srs'

export const MAX_HEARTS = 5
const HEART_REGEN_MS = 20 * 60 * 1000
export const REFILL_COST = 350

export type LessonRecord = { times: number; bestAccuracy: number; lastAt: number }

export type Settings = {
  sound: boolean
  showPinyin: boolean
  speechRate: number
}

export type Stats = {
  lessonsCompleted: number
  perfectLessons: number
  totalCorrect: number
  totalAnswers: number
  charsWritten: number
  tonesCorrect: number
  secondsSpent: number
}

export type AppState = {
  name: string
  onboarded: boolean
  dailyGoal: number
  xp: number
  xpByDay: Record<string, number>
  streak: number
  bestStreak: number
  lastActiveDay: string | null
  freezes: number
  gems: number
  hearts: number
  heartsUpdatedAt: number
  lessons: Record<string, LessonRecord>
  words: Record<string, WordProgress>
  achievements: Record<string, number>
  settings: Settings
  stats: Stats
}

export type LessonResult = {
  lessonId?: string
  xp: number
  correct: number
  total: number
  seconds: number
}

export type CompletionOutcome = {
  streakExtended: boolean
  streak: number
  goalReached: boolean
  newAchievements: string[]
  gemsEarned: number
}

type Actions = {
  setName: (name: string) => void
  finishOnboarding: (goal: number) => void
  setDailyGoal: (goal: number) => void
  setSettings: (s: Partial<Settings>) => void
  recordWord: (wordId: string, ok: boolean) => void
  loseHeart: () => void
  regenHearts: () => void
  refillHearts: () => boolean
  buyFreeze: () => boolean
  addStat: (key: keyof Stats, n?: number) => void
  completeLesson: (r: LessonResult) => CompletionOutcome
  syncStreak: () => void
  reset: () => void
}

const initial: AppState = {
  name: 'Ученик',
  onboarded: false,
  dailyGoal: 30,
  xp: 0,
  xpByDay: {},
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  freezes: 0,
  gems: 500,
  hearts: MAX_HEARTS,
  heartsUpdatedAt: Date.now(),
  lessons: {},
  words: {},
  achievements: {},
  settings: { sound: true, showPinyin: true, speechRate: 0.85 },
  stats: {
    lessonsCompleted: 0,
    perfectLessons: 0,
    totalCorrect: 0,
    totalAnswers: 0,
    charsWritten: 0,
    tonesCorrect: 0,
    secondsSpent: 0,
  },
}

function unlockAchievements(s: AppState): string[] {
  return achievements.filter((a) => !s.achievements[a.id] && a.check(s)).map((a) => a.id)
}

export const useApp = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setName: (name) => set({ name: name.trim() || 'Ученик' }),
      finishOnboarding: (goal) => set({ onboarded: true, dailyGoal: goal }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      recordWord: (wordId, ok) =>
        set((st) => ({
          words: { ...st.words, [wordId]: review(st.words[wordId], ok) },
          stats: {
            ...st.stats,
            totalAnswers: st.stats.totalAnswers + 1,
            totalCorrect: st.stats.totalCorrect + (ok ? 1 : 0),
          },
        })),
      loseHeart: () =>
        set((st) => ({
          hearts: Math.max(0, st.hearts - 1),
          heartsUpdatedAt: st.hearts === MAX_HEARTS ? Date.now() : st.heartsUpdatedAt,
        })),
      regenHearts: () => {
        const st = get()
        if (st.hearts >= MAX_HEARTS) return
        const gained = Math.floor((Date.now() - st.heartsUpdatedAt) / HEART_REGEN_MS)
        if (gained <= 0) return
        const hearts = Math.min(MAX_HEARTS, st.hearts + gained)
        set({ hearts, heartsUpdatedAt: hearts === MAX_HEARTS ? Date.now() : st.heartsUpdatedAt + gained * HEART_REGEN_MS })
      },
      refillHearts: () => {
        const st = get()
        if (st.gems < REFILL_COST || st.hearts >= MAX_HEARTS) return false
        set({ gems: st.gems - REFILL_COST, hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() })
        return true
      },
      buyFreeze: () => {
        const st = get()
        if (st.gems < 200 || st.freezes >= 2) return false
        set({ gems: st.gems - 200, freezes: st.freezes + 1 })
        return true
      },
      addStat: (key, n = 1) => set((st) => ({ stats: { ...st.stats, [key]: st.stats[key] + n } })),
      syncStreak: () => {
        const st = get()
        if (!st.lastActiveDay || st.streak === 0) return
        const today = dayKey()
        const yesterday = addDays(today, -1)
        if (st.lastActiveDay === today || st.lastActiveDay === yesterday) return
        const missed = Math.round((new Date(today).getTime() - new Date(st.lastActiveDay).getTime()) / 86400000) - 1
        if (missed <= st.freezes) {
          set({ freezes: st.freezes - missed, lastActiveDay: yesterday })
        } else {
          set({ streak: 0 })
        }
      },
      completeLesson: (r) => {
        get().syncStreak()
        const st = get()
        const today = dayKey()
        const streakExtended = st.lastActiveDay !== today
        const streak = streakExtended ? st.streak + 1 : st.streak
        const prevToday = st.xpByDay[today] ?? 0
        const todayXp = prevToday + r.xp
        const goalReached = prevToday < st.dailyGoal && todayXp >= st.dailyGoal
        const accuracy = r.total ? r.correct / r.total : 1
        const perfect = r.total > 0 && r.correct === r.total
        const gemsEarned = 5 + (perfect ? 10 : 0) + (goalReached ? 20 : 0)
        const lessons = { ...st.lessons }
        if (r.lessonId) {
          const prev = lessons[r.lessonId]
          lessons[r.lessonId] = {
            times: (prev?.times ?? 0) + 1,
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
            lastAt: Date.now(),
          }
        }
        const next: AppState = {
          ...st,
          xp: st.xp + r.xp,
          xpByDay: { ...st.xpByDay, [today]: todayXp },
          streak,
          bestStreak: Math.max(st.bestStreak, streak),
          lastActiveDay: today,
          gems: st.gems + gemsEarned,
          lessons,
          stats: {
            ...st.stats,
            lessonsCompleted: st.stats.lessonsCompleted + 1,
            perfectLessons: st.stats.perfectLessons + (perfect ? 1 : 0),
            secondsSpent: st.stats.secondsSpent + r.seconds,
          },
        }
        const newAchievements = unlockAchievements(next)
        const now = Date.now()
        next.achievements = { ...next.achievements, ...Object.fromEntries(newAchievements.map((id) => [id, now])) }
        set(next)
        return { streakExtended, streak, goalReached, newAchievements, gemsEarned }
      },
      reset: () => set({ ...initial, heartsUpdatedAt: Date.now(), onboarded: true }),
    }),
    { name: 'moli-progress', version: 1 },
  ),
)

export function todayXp(s: AppState) {
  return s.xpByDay[dayKey()] ?? 0
}
