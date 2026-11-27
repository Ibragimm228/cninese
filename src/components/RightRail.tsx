import { Link } from 'react-router-dom'
import { achievements } from '../data/achievements'
import { lastNDays, weekdayShort } from '../lib/date'
import { useApp, todayXp } from '../lib/store'
import { AchievementIcon, BoltIcon, FlameIcon, SnowIcon } from './icons'

export function RightRail() {
  const s = useApp()
  const xpToday = todayXp(s)
  const pct = Math.min(1, xpToday / s.dailyGoal)
  const days = lastNDays(7)
  const unlocked = achievements.filter((a) => s.achievements[a.id])
  return (
    <aside className="right-rail hidden w-[310px] shrink-0 flex-col gap-4 lg:flex" aria-label="Прогресс обучения">
      <section className="rounded-3xl border-2 border-paper-3 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Цель дня</h3>
          <Link to="/profile" className="text-xs font-bold uppercase tracking-wider text-sky hover:underline">
            Изменить
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative size-16">
            <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
              <circle cx="32" cy="32" r="27" stroke="var(--color-paper-3)" strokeWidth="8" fill="none" />
              <circle
                cx="32"
                cy="32"
                r="27"
                stroke="#f2b33d"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={2 * Math.PI * 27}
                strokeDashoffset={2 * Math.PI * 27 * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)' }}
              />
            </svg>
            <BoltIcon size={24} className="absolute inset-0 m-auto" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold">
              {xpToday}
              <span className="text-base text-ink-soft"> / {s.dailyGoal} XP</span>
            </p>
            <p className="text-sm text-ink-soft">{pct >= 1 ? 'Готово' : `Осталось ${Math.max(0, s.dailyGoal - xpToday)} XP`}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-paper-3 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <FlameIcon size={26} />
          <h3 className="font-display text-base font-bold">{s.streak} дн. подряд</h3>
          {s.freezes > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs font-bold text-[#5BC0F8]">
              <SnowIcon size={16} />×{s.freezes}
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const active = (s.xpByDay[d] ?? 0) > 0
            return (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-ink-soft">{weekdayShort(d)}</span>
                <span
                  className={`grid size-8 place-items-center rounded-full ${active ? 'bg-[#ff9f1c] text-white' : 'bg-paper-2 text-paper-3'}`}
                >
                  {active ? <FlameIcon size={18} /> : '·'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-ink p-5 text-paper">
        <div className="flex items-start justify-between">
          <h3 className="font-display text-base font-bold">Лига Нефрита</h3>
          <span className="font-brush text-5xl leading-none text-red">赛</span>
        </div>
        <Link to="/league" className="mt-4 inline-flex text-sm font-bold uppercase tracking-wider text-gold hover:underline">
          Открыть таблицу
        </Link>
      </section>

      <section className="rounded-3xl border-2 border-paper-3 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Достижения</h3>
          <span className="text-sm font-semibold text-ink-soft">
            {unlocked.length}/{achievements.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a.id}
              title={`${a.title} — ${a.desc}`}
              className={`grid size-11 place-items-center rounded-xl text-xl ${s.achievements[a.id] ? 'bg-gold/25 text-ink' : 'bg-paper-2 text-ink-soft opacity-65'}`}
            >
              <AchievementIcon symbol={a.icon} size={21} />
            </span>
          ))}
        </div>
      </section>

    </aside>
  )
}
