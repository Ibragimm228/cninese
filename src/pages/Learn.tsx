import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { BookIcon, CheckIcon, LockIcon, StarIcon, TrophyIcon } from '../components/icons'
import { RightRail } from '../components/RightRail'
import { lessonsOfUnit, units, wordById } from '../data/curriculum'
import type { Lesson, Unit } from '../data/types'
import { lessonStatus, unitProgress, type LessonStatus } from '../lib/progress'
import { useApp } from '../lib/store'

const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52]

export default function Learn() {
  const s = useApp()
  const [tipUnit, setTipUnit] = useState<Unit | null>(null)
  const currentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
    return () => clearTimeout(t)
  }, [])

  if (!s.onboarded) return <Navigate to="/welcome" replace />

  return (
    <div className="mx-auto flex max-w-[1100px] gap-10 px-4 pt-6 md:px-8 md:pt-10">
      <div className="min-w-0 flex-1">
        {units.map((u) => (
          <UnitSection key={u.id} unit={u} onTip={() => setTipUnit(u)} currentRef={currentRef} />
        ))}
        <div className="my-16 text-center">
          <p className="font-brush text-7xl text-red">加油</p>
          <p className="mt-2 font-display text-sm uppercase tracking-[0.3em] text-ink-soft">Новые юниты скоро</p>
        </div>
      </div>
      <RightRail />
      <AnimatePresence>{tipUnit && <TipModal unit={tipUnit} onClose={() => setTipUnit(null)} />}</AnimatePresence>
    </div>
  )
}

function UnitSection({
  unit,
  onTip,
  currentRef,
}: {
  unit: Unit
  onTip: () => void
  currentRef: React.RefObject<HTMLDivElement | null>
}) {
  const s = useApp()
  const ls = lessonsOfUnit(unit.id)
  const prog = unitProgress(s, unit.id)
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="mb-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[28px] p-6 text-white md:p-7"
        style={{ background: unit.color, boxShadow: `0 6px 0 ${unit.shadow}` }}
      >
        <span className="pointer-events-none absolute -right-4 -top-8 select-none font-brush text-[150px] leading-none text-white/15 md:text-[180px]">
          {unit.hanzi}
        </span>
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
              Юнит {unit.index + 1} · HSK 1
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold md:text-3xl">{unit.title}</h2>
            <p className="mt-1 text-white/85">{unit.subtitle}</p>
          </div>
          <button
            onClick={onTip}
            className="btn3d flex shrink-0 items-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-4 py-3 text-xs text-white backdrop-blur"
            style={{ ['--btn-shadow' as string]: unit.shadow }}
          >
            <BookIcon size={18} /> <span className="hidden sm:inline">Подсказка</span>
          </button>
        </div>
        <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-black/15">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            whileInView={{ width: `${prog.ratio * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>

      <div className="relative mt-10 flex flex-col items-center gap-5">
        {ls.map((l, i) => {
          const status = lessonStatus(s, l)
          return (
            <div
              key={l.id}
              ref={status === 'current' ? currentRef : undefined}
              className="relative"
              style={{ transform: `translateX(${OFFSETS[(i + unit.index * 3) % OFFSETS.length]}px)` }}
            >
              <LessonNode
                lesson={l}
                unit={unit}
                status={status}
                open={open === l.id}
                onToggle={() => setOpen(open === l.id ? null : l.id)}
              />
            </div>
          )
        })}
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute top-6 hidden select-none font-brush text-[120px] leading-none opacity-[0.08] md:block',
            unit.index % 2 ? 'left-0' : 'right-0',
          )}
          style={{ color: unit.color }}
        >
          {unit.hanzi[0]}
        </span>
      </div>
    </section>
  )
}

function LessonNode({
  lesson,
  unit,
  status,
  open,
  onToggle,
}: {
  lesson: Lesson
  unit: Unit
  status: LessonStatus
  open: boolean
  onToggle: () => void
}) {
  const navigate = useNavigate()
  const rec = useApp((s) => s.lessons[lesson.id])
  const Icon = lesson.kind === 'test' ? TrophyIcon : lesson.kind === 'review' ? BookIcon : StarIcon
  const locked = status === 'locked'
  const done = status === 'done'
  const color = locked ? '#e0d7c5' : done ? '#f2b33d' : unit.color
  const shadow = locked ? '#cbc0aa' : done ? '#c98a17' : unit.shadow
  const words = lesson.newWordIds.map((id) => wordById.get(id)!)
  const big = lesson.kind === 'test'

  return (
    <div className="relative flex flex-col items-center">
      {status === 'current' && !open && (
        <motion.div
          className="absolute -top-12 z-10 whitespace-nowrap rounded-xl border-2 border-paper-3 bg-[#fffdf8] px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider"
          style={{ color: unit.color }}
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        >
          Начать
          <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-paper-3 bg-[#fffdf8]" />
        </motion.div>
      )}
      <button
        onClick={onToggle}
        className={clsx(
          'relative grid place-items-center rounded-full transition-transform active:translate-y-[6px]',
          big ? 'size-[88px]' : 'size-[74px]',
        )}
        style={{ background: color, boxShadow: `0 7px 0 ${shadow}` }}
        aria-label={`${lesson.title}${locked ? ' (закрыт)' : ''}`}
      >
        {status === 'current' && (
          <span className="absolute -inset-[10px] rounded-full border-[6px] border-paper-3">
            <span className="pulse-ring absolute inset-0 rounded-full" style={{ color: unit.color }} />
          </span>
        )}
        <span className="absolute inset-x-3 top-2 h-3 rounded-full bg-white/25" />
        {locked ? (
          <LockIcon size={30} className="text-[#a99f8a]" />
        ) : done && lesson.kind === 'learn' ? (
          <CheckIcon size={34} className="text-white" />
        ) : (
          <Icon size={big ? 40 : 34} className="text-white" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+18px)] z-20 w-72 rounded-3xl p-5 text-white"
            style={{ background: locked ? '#3a3835' : unit.color, boxShadow: `0 6px 0 ${locked ? '#1d1c1a' : unit.shadow}` }}
          >
            <span
              className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45"
              style={{ background: locked ? '#3a3835' : unit.color }}
            />
            <h4 className="font-display text-lg font-bold">{lesson.title}</h4>
            <p className="mt-1 text-sm text-white/85">
              {locked
                ? 'Пройди предыдущие уроки, чтобы открыть этот.'
                : lesson.kind === 'learn'
                  ? `Новые слова: ${words.map((w) => w.hanzi).join(' · ')}`
                  : lesson.kind === 'review'
                    ? 'Закрепи все слова и фразы юнита.'
                    : 'Финальная проверка юнита. Без подсказок!'}
            </p>
            {rec && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/75">
                Лучшая точность: {Math.round(rec.bestAccuracy * 100)}%
              </p>
            )}
            {!locked && (
              <Button
                variant="paper"
                className="mt-4 w-full border-0"
                style={{ color: unit.color }}
                onClick={() => navigate(`/lesson/${lesson.id}`)}
              >
                {done ? 'Повторить +5 XP' : `Начать +${lesson.kind === 'test' ? 25 : 15} XP`}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TipModal({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, rotate: -2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-paper p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute -right-6 -top-10 font-brush text-[200px] leading-none opacity-10" style={{ color: unit.color }}>
          {unit.hanzi[0]}
        </span>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: unit.color }}>
          Юнит {unit.index + 1} · Грамматика
        </p>
        <h3 className="mt-2 font-display text-3xl font-bold">{unit.tip.title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">{unit.tip.body}</p>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {unit.words.slice(0, 8).map((w) => (
            <div key={w.id} className="rounded-2xl bg-paper-2 p-3 text-center">
              <div className="font-hanzi text-2xl font-semibold">{w.hanzi}</div>
              <div className="text-xs text-ink-soft">{w.pinyin}</div>
            </div>
          ))}
        </div>
        <Button variant="ink" className="mt-7 w-full" onClick={onClose}>
          Понятно
        </Button>
      </motion.div>
    </motion.div>
  )
}
