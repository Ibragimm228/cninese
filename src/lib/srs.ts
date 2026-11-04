export type WordProgress = {
  reps: number
  ease: number
  interval: number
  due: number
  lapses: number
  correct: number
  wrong: number
  lastSeen: number
}

const DAY = 24 * 60 * 60 * 1000

export function newProgress(): WordProgress {
  return { reps: 0, ease: 2.5, interval: 0, due: Date.now(), lapses: 0, correct: 0, wrong: 0, lastSeen: Date.now() }
}

export function review(p: WordProgress | undefined, ok: boolean): WordProgress {
  const cur = p ?? newProgress()
  const now = Date.now()
  if (!ok) {
    return {
      ...cur,
      reps: 0,
      interval: 0,
      ease: Math.max(1.3, cur.ease - 0.2),
      due: now + 10 * 60 * 1000,
      lapses: cur.lapses + 1,
      wrong: cur.wrong + 1,
      lastSeen: now,
    }
  }
  const reps = cur.reps + 1
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(cur.interval * cur.ease)
  return {
    ...cur,
    reps,
    interval,
    ease: Math.min(3, cur.ease + 0.05),
    due: now + interval * DAY,
    correct: cur.correct + 1,
    lastSeen: now,
  }
}

export function strength(p: WordProgress | undefined): number {
  if (!p) return 0
  const overdue = Math.max(0, Date.now() - p.due) / DAY
  const base = Math.min(1, (p.reps + 1) / 5)
  return Math.max(0.15, base - overdue * 0.1)
}
