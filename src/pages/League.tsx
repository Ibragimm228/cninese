import clsx from 'clsx'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/AppShell'
import { RightRail } from '../components/RightRail'
import { addDays, dayKey } from '../lib/date'
import { useApp } from '../lib/store'
import { leagueTable, session, syncAvailable, type LeagueRow } from '../lib/sync'
import { useEffect, useState } from 'react'

const BOTS = ['Аня', 'Lǐ Wěi', 'Дмитрий', 'Мария К.', 'Wáng Fāng', 'Тимур', 'Олег', 'Zhāng Lì', 'Катя', 'Артём', 'Софья', 'Chén Jié', 'Ильяс', 'Полина']

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

function weekStart() {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  return addDays(dayKey(d), -day)
}

export default function League() {
  const s = useApp()
  const start = weekStart()
  const elapsed = Math.round((Date.now() - new Date(start + 'T00:00:00').getTime()) / 86400000 * 10) / 10
  const rnd = seeded(Number(start.replace(/-/g, '')))
  const myXp = Array.from({ length: 7 }, (_, i) => s.xpByDay[addDays(start, i)] ?? 0).reduce((a, b) => a + b, 0)
  // signed-in learners compete with each other; everyone else gets the practice table of bots
  const [live, setLive] = useState<LeagueRow[] | null>(null)
  useEffect(() => {
    if (!syncAvailable || !session()) return
    let cancelled = false
    leagueTable().then((t) => !cancelled && t.some((r) => r.me) && setLive(t)).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const rows = live ?? [
    ...BOTS.map((name) => ({ name, xp: Math.round(rnd() * 90 * Math.min(7, elapsed + 0.3)), me: false })),
    { name: s.name, xp: myXp, me: true },
  ].sort((a, b) => b.xp - a.xp)
  const daysLeft = 7 - Math.floor(elapsed)

  return (
    <div className="mx-auto flex max-w-[1100px] gap-10 px-4 pt-6 md:px-8 md:pt-10">
      <div className="min-w-0 flex-1">
        <PageHeader title="Лига Нефрита">
          <span className="rounded-full bg-paper-2 px-4 py-2 font-display text-sm font-semibold">Осталось {daysLeft} дн.</span>
        </PageHeader>
        <div className="mode-card mb-6 flex items-center gap-4 overflow-hidden rounded-3xl p-5 text-white" style={{ '--m': '#22a06b', '--m-shadow': '#17784f' } as React.CSSProperties}>
          <span className="font-brush text-6xl">玉</span>
          <p className="mode-desc font-display text-lg font-bold text-white">Топ-5 переходят в Лигу Золота</p>
        </div>
        <ol className="league-list overflow-hidden rounded-3xl border-2 border-paper-3 bg-card">
          {rows.map((r, i) => (
            <motion.li
              key={r.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={clsx('flex items-center gap-4 border-b-2 border-paper-2 px-5 py-3.5 last:border-0', r.me && 'bg-sky-soft', i === 5 && 'border-b-jade')}
            >
              <span className={clsx('w-7 text-center font-display font-bold', i < 3 ? 'text-gold' : 'text-ink-soft')}>{i + 1}</span>
              <span className={clsx('grid size-10 place-items-center rounded-full font-display font-bold text-white')} style={{ background: r.me ? '#3d7bf7' : ['#e63b2e', '#22a06b', '#8b5cf6', '#f2b33d', '#ec4899', '#0ea5a4'][i % 6] }}>
                {r.name[0]}
              </span>
              <span className={clsx('flex-1 font-semibold', r.me && 'text-sky-dark')}>{r.name}{r.me && ' (ты)'}</span>
              <span className="font-display font-bold text-ink-soft">{r.xp} XP</span>
            </motion.li>
          ))}
        </ol>
      </div>
      <RightRail />
    </div>
  )
}
