import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { PageHeader } from '../components/AppShell'
import { Button } from '../components/Button'
import { BoltIcon, FlameIcon, GemIcon, SnowIcon, TrophyIcon } from '../components/icons'
import { achievements } from '../data/achievements'
import { lessons } from '../data/curriculum'
import { lastNDays, weekdayShort } from '../lib/date'
import { learnedWords } from '../lib/progress'
import { hasChineseVoice } from '../lib/speech'
import { useApp } from '../lib/store'

export default function Profile() {
  const s = useApp()
  const [name, setName] = useState(s.name)
  const [confirmReset, setConfirmReset] = useState(false)
  const days = lastNDays(7)
  const max = Math.max(s.dailyGoal, ...days.map((d) => s.xpByDay[d] ?? 0))
  const done = Object.keys(s.lessons).length
  const stats = [
    { icon: <FlameIcon size={28} />, value: s.streak, label: 'дней подряд' },
    { icon: <BoltIcon size={28} />, value: s.xp, label: 'всего XP' },
    { icon: <TrophyIcon size={28} className="text-gold" />, value: `${done}/${lessons.length}`, label: 'уроков' },
    { icon: <span className="font-hanzi text-2xl font-black text-red">字</span>, value: learnedWords(s).length, label: 'слов изучено' },
  ]
  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-6 md:px-8 md:pt-10">
      <PageHeader kicker="我 · Профиль" title={s.name} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((x, i) => (
          <motion.div key={x.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-4">
            {x.icon}
            <div>
              <p className="font-display text-xl font-bold">{x.value}</p>
              <p className="text-xs text-ink-soft">{x.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="mt-8 rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-6">
        <h2 className="font-display text-lg font-bold">Опыт за неделю</h2>
        <div className="mt-6 flex h-48 items-end gap-3">
          {days.map((d, i) => {
            const v = s.xpByDay[d] ?? 0
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-bold text-ink-soft">{v || ''}</span>
                <motion.div className={clsx('w-full rounded-xl', v >= s.dailyGoal ? 'bg-gold' : 'bg-sky')} initial={{ height: 0 }} animate={{ height: `${(v / max) * 140}px` }} transition={{ delay: i * 0.05, type: 'spring', damping: 18 }} style={{ minHeight: 6 }} />
                <span className="text-xs font-semibold text-ink-soft">{weekdayShort(d)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold">Достижения</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {achievements.map((a) => {
            const got = !!s.achievements[a.id]
            return (
              <div key={a.id} className={clsx('rounded-3xl border-2 p-4 text-center', got ? 'border-gold border-b-[5px] bg-[#fffdf8]' : 'border-paper-3 bg-paper-2 opacity-60')}>
                <div className={clsx('text-4xl', !got && 'grayscale')}>{a.icon}</div>
                <p className="mt-2 font-display text-sm font-bold">{a.title}</p>
                <p className="text-xs text-ink-soft">{a.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-6">
          <h2 className="font-display text-lg font-bold">Настройки</h2>
          <label className="mt-5 block text-sm font-semibold text-ink-soft">Имя</label>
          <div className="mt-1 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} className="flex-1 rounded-xl border-2 border-paper-3 px-4 py-2.5 outline-none focus:border-sky" />
            <Button variant="ink" className="px-4 py-2.5" onClick={() => s.setName(name)}>OK</Button>
          </div>
          <label className="mt-5 block text-sm font-semibold text-ink-soft">Цель дня</label>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {[10, 30, 50, 80].map((g) => (
              <button key={g} onClick={() => s.setDailyGoal(g)} className={clsx('rounded-xl border-2 py-2 font-display text-sm font-bold', s.dailyGoal === g ? 'border-sky bg-[#e8f0ff] text-sky-dark' : 'border-paper-3')}>
                {g} XP
              </button>
            ))}
          </div>
          <Toggle label="Звуковые эффекты" value={s.settings.sound} onChange={(v) => s.setSettings({ sound: v })} />
          <Toggle label="Показывать пиньинь" value={s.settings.showPinyin} onChange={(v) => s.setSettings({ showPinyin: v })} />
          <label className="mt-5 block text-sm font-semibold text-ink-soft">Скорость озвучки: {s.settings.speechRate.toFixed(2)}×</label>
          <input type="range" min={0.5} max={1.2} step={0.05} value={s.settings.speechRate} onChange={(e) => s.setSettings({ speechRate: Number(e.target.value) })} className="mt-2 w-full accent-red" />
          {!hasChineseVoice() && <p className="mt-3 rounded-xl bg-gold/20 p-3 text-sm">В браузере не найден китайский голос — озвучка может не работать. Лучше всего — Chrome, Edge или Safari.</p>}
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">Магазин <GemIcon size={20} /> <span className="text-sky">{s.gems}</span></h2>
            <div className="mt-4 flex items-center gap-3">
              <SnowIcon size={36} />
              <div className="flex-1">
                <p className="font-semibold">Заморозка серии</p>
                <p className="text-sm text-ink-soft">Сохранит серию, если пропустишь день. У тебя: {s.freezes}/2</p>
              </div>
              <Button variant="sky" className="px-4 py-2.5" disabled={s.gems < 200 || s.freezes >= 2} onClick={() => s.buyFreeze()}>200</Button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl">❤️</span>
              <div className="flex-1">
                <p className="font-semibold">Полные сердца</p>
                <p className="text-sm text-ink-soft">Сейчас: {s.hearts}/5</p>
              </div>
              <Button variant="sky" className="px-4 py-2.5" disabled={s.gems < 350 || s.hearts >= 5} onClick={() => s.refillHearts()}>350</Button>
            </div>
          </div>
          <div className="rounded-3xl border-2 border-wrong/30 p-6">
            <h2 className="font-display text-lg font-bold">Сбросить прогресс</h2>
            <p className="mt-1 text-sm text-ink-soft">Удалит весь прогресс, XP и достижения в этом браузере.</p>
            {confirmReset ? (
              <div className="mt-4 flex gap-2">
                <Button variant="wrong" onClick={() => { s.reset(); setConfirmReset(false) }}>Да, сбросить</Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>Отмена</Button>
              </div>
            ) : (
              <Button variant="ghost" className="mt-4" onClick={() => setConfirmReset(true)}>Сбросить</Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="mt-5 flex w-full items-center justify-between" role="switch" aria-checked={value}>
      <span className="font-semibold">{label}</span>
      <span className={clsx('relative h-7 w-12 rounded-full transition-colors', value ? 'bg-jade' : 'bg-paper-3')}>
        <motion.span layout className="absolute top-1 size-5 rounded-full bg-white shadow" style={{ left: value ? 24 : 4 }} />
      </span>
    </button>
  )
}
