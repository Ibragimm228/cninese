import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { CompanionCard } from '../components/Companion'
import { BookIcon, CheckIcon, LockIcon, StarIcon, TrophyIcon } from '../components/icons'
import { RightRail } from '../components/RightRail'
import { lessons, lessonsOfUnit, units, wordById } from '../data/curriculum'
import type { Lesson, Unit } from '../data/types'
import { currentLessonIndex, lessonStatus, unitProgress, type LessonStatus } from '../lib/progress'
import { useApp } from '../lib/store'

export default function Learn() {
  const s = useApp()
  const [tipUnit, setTipUnit] = useState<Unit | null>(null)
  const [openLesson, setOpenLesson] = useState<string | null>(null)
  const next = lessons[currentLessonIndex(s)]
  const completed = Object.keys(s.lessons).length
  if (!s.onboarded) return <Navigate to="/welcome" replace />

  return (
    <div className="learn-layout">
      <div className="learn-intro">
        <h1>你好, {s.name}<span>.</span></h1>
      </div>

      <section className="learn-hero" aria-label="Следующий шаг">
        <div className="learn-hero-grid" aria-hidden="true" />
        <span className="learn-hero-hanzi" aria-hidden="true">学</span>
        <div className="learn-hero-copy">
          <h2>{next ? next.title : 'HSK 1 пройден!'}</h2>
          <Link className="editorial-cta" to={next ? `/lesson/${next.id}` : '/practice'}>
            {next ? 'К уроку' : 'Практика'}
          </Link>
        </div>
        <span className="learn-hero-index" aria-hidden="true">学 / STUDY</span>
      </section>

      <div className="learn-pet"><CompanionCard /></div>
      <div className="learn-track">
        <div className="track-heading">
          <h2>HSK 1</h2>
          <span>{completed} / {lessons.length} уроков</span>
        </div>
        {units.map((unit) => (
          <UnitSection
            key={unit.id}
            unit={unit}
            onTip={() => setTipUnit(unit)}
            openLesson={openLesson}
            onToggle={(id) => setOpenLesson((open) => (open === id ? null : id))}
          />
        ))}
        <div className="my-16 text-center">
          <p className="font-brush text-7xl text-red">加油</p>
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
  openLesson,
  onToggle,
}: {
  unit: Unit
  onTip: () => void
  openLesson: string | null
  onToggle: (id: string) => void
}) {
  const s = useApp()
  const list = lessonsOfUnit(unit.id)
  const progress = unitProgress(s, unit.id)

  return (
    <section className="unit-group">
      <div className="unit-heading">
        <div className="unit-stamp" style={{ color: unit.color }} aria-hidden="true">{unit.hanzi[0]}</div>
        <div>
          <p className="studio-label">Юнит {unit.index + 1}</p>
          <h3>{unit.title}</h3>
        </div>
        <button type="button" className="editorial-icon" onClick={onTip} aria-label={`Подсказка: ${unit.title}`} title="Подсказка"><BookIcon size={19} /></button>
      </div>
      <div className="unit-progress" role="progressbar" aria-label={`Прогресс: ${unit.title}`} aria-valuenow={Math.round(progress.ratio * 100)}>
        <span style={{ width: `${progress.ratio * 100}%`, background: unit.color }} />
      </div>
      <div>
        {list.map((lesson, index) => (
          <LessonRow key={lesson.id} lesson={lesson} index={index} status={lessonStatus(s, lesson)} open={openLesson === lesson.id} onToggle={() => onToggle(lesson.id)} />
        ))}
      </div>
    </section>
  )
}

function LessonRow({ lesson, index, status, open, onToggle }: { lesson: Lesson; index: number; status: LessonStatus; open: boolean; onToggle: () => void }) {
  const rec = useApp((s) => s.lessons[lesson.id])
  const Icon = status === 'locked' ? LockIcon : status === 'done' ? CheckIcon : lesson.kind === 'test' ? TrophyIcon : lesson.kind === 'review' ? BookIcon : StarIcon
  const description = status === 'locked' ? 'Пройди предыдущие уроки, чтобы открыть этот.'
    : lesson.kind === 'learn' ? `Новые слова: ${lesson.newWordIds.map((id) => wordById.get(id)!.hanzi).join(' · ')}`
    : lesson.kind === 'review' ? 'Закрепи все слова и фразы юнита.' : 'Финальная проверка юнита. Без подсказок!'

  return (
    <div className="lesson-row" data-status={status}>
      <button type="button" onClick={onToggle} aria-expanded={open}>
        <span className="lesson-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="lesson-title">{lesson.title}</span>
        {status === 'current' && <span className="lesson-now">СЕЙЧАС</span>}
        <span className="lesson-status" aria-label={status === 'locked' ? 'Закрыт' : status === 'done' ? 'Пройден' : undefined}><Icon size={17} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="lesson-details">
              <p>{description}</p>
              {rec && <p>Лучшая точность: {Math.round(rec.bestAccuracy * 100)}%</p>}
              {status !== 'locked' && <Link className="editorial-cta" to={`/lesson/${lesson.id}`}>{status === 'done' ? 'Повторить +5 XP' : `Начать +${lesson.kind === 'test' ? 25 : 15} XP`}</Link>}
            </div>
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
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-paper p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute -right-6 -top-10 font-brush text-[200px] leading-none opacity-10" style={{ color: unit.color }}>
          {unit.hanzi[0]}
        </span>
        <p className="studio-label text-red">Юнит {unit.index + 1}, грамматика</p>
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
        <Button variant="ink" className="mt-7 w-full" onClick={onClose}>Понятно</Button>
      </motion.div>
    </motion.div>
  )
}
