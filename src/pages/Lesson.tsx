import confetti from 'canvas-confetti'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ExerciseView, type ExResult } from '../components/exercises'
import { BoltIcon, CheckIcon, CloseIcon, FlameIcon, GemIcon, HeartIcon } from '../components/icons'
import { achievements } from '../data/achievements'
import { lessonById, units } from '../data/curriculum'
import { exerciseWordIds, generateLesson, generatePractice, type Exercise, type PracticeMode } from '../lib/exercises'
import { dueWords, isUnlocked, learnedWords, weakWords } from '../lib/progress'
import { sfx } from '../lib/sounds'
import { hasChineseVoice } from '../lib/speech'
import { MAX_HEARTS, REFILL_COST, useApp, type CompletionOutcome } from '../lib/store'

const PRAISE = ['Отлично!', 'Верно!', 'Великолепно!', '太棒了！', 'Так держать!', 'Супер!', '很好！']

export function LessonRoute() {
  const { id = '' } = useParams()
  const lesson = lessonById.get(id)
  const lessons = useApp((s) => s.lessons)
  const exercises = useMemo(() => (lesson ? generateLesson(lesson, { voice: hasChineseVoice() }) : []), [lesson])
  const [repeat] = useState(() => !!lesson && !!useApp.getState().lessons[lesson.id])
  if (!lesson || !isUnlocked({ lessons }, lesson.id)) return <Navigate to="/learn" replace />
  const unit = units.find((u) => u.id === lesson.unitId)!
  return (
    <LessonPlayer
      key={lesson.id}
      exercises={exercises}
      lessonId={lesson.id}
      xp={repeat ? 5 : lesson.kind === 'test' ? 25 : 15}
      accent={unit.color}
      exitTo="/learn"
    />
  )
}

export function PracticeRoute() {
  const { mode = 'review' } = useParams()
  const state = useApp.getState()
  const exercises = useMemo(() => {
    const m = mode as PracticeMode
    const pool = m === 'mistakes' ? weakWords(state) : m === 'review' ? [...dueWords(state), ...learnedWords(state)] : learnedWords(state)
    const uniq = [...new Map(pool.map((w) => [w.id, w])).values()]
    return generatePractice(m, uniq, { voice: hasChineseVoice() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  return <LessonPlayer key={mode} exercises={exercises} xp={10} practice accent="#8b5cf6" exitTo="/practice" />
}

type Phase = 'play' | 'results' | 'streak' | 'achievements'

function LessonPlayer({
  exercises,
  lessonId,
  xp,
  practice,
  accent,
  exitTo,
}: {
  exercises: Exercise[]
  lessonId?: string
  xp: number
  practice?: boolean
  accent: string
  exitTo: string
}) {
  const navigate = useNavigate()
  const { hearts, loseHeart, recordWord, completeLesson, refillHearts, gems } = useApp()
  const [queue, setQueue] = useState(exercises)
  const [idx, setIdx] = useState(0)
  const [pending, setPending] = useState<ExResult | null>(null)
  const [checked, setChecked] = useState<ExResult | null>(null)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [phase, setPhase] = useState<Phase>('play')
  const [outcome, setOutcome] = useState<CompletionOutcome | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [praise, setPraise] = useState(PRAISE[0])
  const start = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  const ex = queue[idx]
  const outOfHearts = !practice && hearts <= 0 && phase === 'play'
  const progress = phase === 'play' ? idx / queue.length : 1

  const onChange = useCallback((r: ExResult | null) => setPending(r), [])

  const finish = useCallback(() => {
    const seconds = Math.round((Date.now() - start.current) / 1000)
    setElapsed(seconds)
    const o = completeLesson({ lessonId, xp: xp + (answered > 0 && correct === answered ? 5 : 0), correct, total: answered, seconds })
    setOutcome(o)
    setPhase('results')
    sfx.complete()
    const end = Date.now() + 900
    const colors = ['#e63b2e', '#f2b33d', '#22a06b', '#3d7bf7']
    ;(function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }, [completeLesson, lessonId, xp, answered, correct])

  const next = useCallback(() => {
    setChecked(null)
    setPending(null)
    if (idx + 1 >= queue.length) finish()
    else setIdx(idx + 1)
  }, [idx, queue.length, finish])

  const check = useCallback((override?: ExResult) => {
    const pending_ = override ?? pending
    if (!pending_ || !ex) return
    if (ex.type === 'intro') {
      recordWord(ex.word.id, true)
      next()
      return
    }
    setChecked(pending_)
    setAnswered((a) => a + 1)
    const ids = exerciseWordIds(ex)
    if (pending_.ok) {
      sfx.correct()
      setCorrect((c) => c + 1)
      setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)])
      const nc = combo + 1
      setCombo(nc)
      if (nc >= 3 && nc % 3 === 0) {
        setShowCombo(true)
        setTimeout(() => setShowCombo(false), 1400)
      }
      ids.forEach((id) => recordWord(id, true))
    } else {
      sfx.wrong()
      setCombo(0)
      if (!practice) loseHeart()
      ids.forEach((id) => recordWord(id, false))
      setQueue((q) => [...q, { ...ex, key: `${ex.key}-retry${q.length}` }])
    }
  }, [pending, ex, next, combo, practice, loseHeart, recordWord])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || phase !== 'play' || confirmExit || outOfHearts) return
      if ((e.target as HTMLElement)?.tagName === 'BUTTON') return
      e.preventDefault()
      if (checked) next()
      else check()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [checked, next, check, phase, confirmExit, outOfHearts])

  if (!queue.length)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="font-brush text-8xl text-red">空</p>
          <p className="mt-4 font-display text-xl font-bold">Пока нечего повторять</p>
          <Button className="mt-6" onClick={() => navigate(exitTo)}>
            Назад
          </Button>
        </div>
      </div>
    )

  if (phase !== 'play' && outcome)
    return (
      <Results
        phase={phase}
        outcome={outcome}
        xp={xp + (answered > 0 && correct === answered ? 5 : 0)}
        accuracy={answered ? correct / answered : 1}
        seconds={elapsed}
        onNext={() => {
          if (phase === 'results' && outcome.streakExtended) setPhase('streak')
          else if (phase !== 'achievements' && outcome.newAchievements.length) setPhase('achievements')
          else navigate(exitTo)
        }}
      />
    )

  const isIntro = ex.type === 'intro'

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 pb-2 pt-5 md:px-8 md:pt-8">
        <button
          onClick={() => setConfirmExit(true)}
          className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
          aria-label="Выйти"
        >
          <CloseIcon size={24} />
        </button>
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-paper-3">
          <motion.div
            className="relative h-full rounded-full"
            style={{ background: accent }}
            animate={{ width: `${Math.max(4, progress * 100)}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
          >
            <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/35" />
          </motion.div>
          <AnimatePresence>
            {showCombo && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center text-[10px] font-black uppercase tracking-widest text-white mix-blend-difference"
              >
                {combo} подряд!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {practice ? (
          <span className="flex items-center gap-1 font-display font-bold text-plum">
            <BoltIcon size={22} /> ∞
          </span>
        ) : (
          <motion.span key={hearts} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 font-display text-lg font-bold text-wrong">
            <HeartIcon size={26} empty={hearts === 0} /> {hearts}
          </motion.span>
        )}
      </header>

      <AnimatePresence>
        {combo >= 3 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto w-full max-w-5xl px-4 md:px-8"
          >
            <span className="ml-14 inline-flex items-center gap-1 font-display text-xs font-bold uppercase tracking-widest text-[#f08a00]">
              <FlameIcon size={16} /> {combo} подряд
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-48 pt-6 md:px-8 md:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.key}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <ExerciseView ex={ex} locked={!!checked} onChange={onChange} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer
        className={clsx(
          'fixed inset-x-0 bottom-0 z-20 border-t-2 transition-colors duration-200',
          !checked && 'border-paper-3 bg-paper',
          checked?.ok && 'border-transparent bg-jade-soft',
          checked && !checked.ok && 'border-transparent bg-wrong-soft',
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 md:flex-row md:items-center md:justify-between md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            {checked ? (
              <motion.div
                key="fb"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx('flex items-center gap-4', checked.ok ? 'text-jade-dark' : 'text-wrong-dark')}
              >
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className={clsx('hidden size-16 place-items-center rounded-full bg-white md:grid')}
                >
                  {checked.ok ? <CheckIcon size={36} /> : <CloseIcon size={32} />}
                </motion.span>
                <div>
                  <p className="font-display text-2xl font-bold">{checked.ok ? praise : 'Неверно'}</p>
                  {!checked.ok && checked.solution && (
                    <p className="mt-1 text-[15px]">
                      <span className="font-semibold">Правильный ответ:</span> <span className="font-hanzi">{checked.solution}</span>
                    </p>
                  )}
                  {checked.ok && checked.mistakes ? <p className="mt-1 text-sm">Ошибок по ходу: {checked.mistakes}</p> : null}
                </div>
              </motion.div>
            ) : (
              <motion.div key="skip" className="hidden md:block">
                {!isIntro && ex.type !== 'match' && ex.type !== 'write' && (
                  <Button variant="ghost" onClick={() => check({ ok: false, solution: solutionOf(ex) })}>
                    Не знаю
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant={checked ? (checked.ok ? 'jade' : 'wrong') : isIntro ? 'sky' : 'jade'}
            disabled={!checked && !pending}
            onClick={() => (checked ? next() : check())}
            className="w-full md:w-48"
          >
            {checked ? 'Продолжить' : isIntro ? 'Далее' : 'Проверить'}
          </Button>
        </div>
      </footer>

      <AnimatePresence>
        {confirmExit && (
          <Modal onClose={() => setConfirmExit(false)}>
            <p className="font-brush text-7xl text-red">等等</p>
            <h3 className="mt-2 font-display text-2xl font-bold">Подожди, не уходи!</h3>
            <p className="mt-2 text-ink-soft">Если выйдешь сейчас, прогресс урока будет потерян.</p>
            <Button variant="sky" className="mt-6 w-full" onClick={() => setConfirmExit(false)}>
              Продолжить урок
            </Button>
            <button className="mt-4 w-full py-2 font-bold uppercase tracking-wider text-wrong" onClick={() => navigate(exitTo)}>
              Выйти
            </button>
          </Modal>
        )}
        {outOfHearts && (
          <Modal>
            <div className="flex justify-center gap-1">
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <HeartIcon key={i} size={36} empty />
              ))}
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">Сердца закончились</h3>
            <p className="mt-2 text-ink-soft">Они восстанавливаются со временем (одно за 20 минут). Или пополни их кристаллами.</p>
            <Button variant="sky" className="mt-6 flex w-full items-center justify-center gap-2" disabled={gems < REFILL_COST} onClick={() => refillHearts()}>
              Пополнить за <GemIcon size={18} /> {REFILL_COST}
            </Button>
            <Button variant="paper" className="mt-3 w-full" onClick={() => navigate('/practice/review')}>
              Тренировка без сердец
            </Button>
            <button className="mt-4 w-full py-2 font-bold uppercase tracking-wider text-ink-soft" onClick={() => navigate(exitTo)}>
              Закончить
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function solutionOf(ex: Exercise): string {
  switch (ex.type) {
    case 'choice':
      return ex.direction === 'zh-ru' ? ex.word.ru : `${ex.word.hanzi} (${ex.word.pinyin})`
    case 'listen':
    case 'tone':
      return `${ex.word.hanzi} (${ex.word.pinyin})`
    case 'build':
      return ex.direction === 'zh-ru' ? ex.sentence.ru : `${ex.sentence.tokens.join('')} — ${ex.sentence.ru}`
    case 'fill':
      return ex.sentence.tokens.join('')
    default:
      return ''
  }
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/50 backdrop-blur-sm md:place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="w-full max-w-md rounded-t-[32px] bg-paper p-8 text-center md:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function Results({
  phase,
  outcome,
  xp,
  accuracy,
  seconds,
  onNext,
}: {
  phase: Phase
  outcome: CompletionOutcome
  xp: number
  accuracy: number
  seconds: number
  onNext: () => void
}) {
  const streak = useApp((s) => s.streak)
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Enter' && onNext()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onNext])
  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  const acc = Math.round(accuracy * 100)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-paper px-6 py-10">
      <AnimatePresence mode="wait">
        {phase === 'results' && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 120 }}
              className="relative"
            >
              <span className="absolute inset-0 -z-10 m-auto size-48 rounded-full bg-gold/30 blur-2xl" />
              <span className="font-brush text-[140px] leading-none text-red md:text-[180px]">棒</span>
            </motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-2 font-display text-3xl font-bold md:text-4xl">
              {acc === 100 ? 'Идеально! Без ошибок' : 'Урок пройден!'}
            </motion.h1>
            <p className="mt-2 text-ink-soft">bàng — «отлично, класс!»</p>
            <div className="mt-10 grid w-full grid-cols-3 gap-3">
              {[
                { label: 'Опыт', value: `+${xp}`, color: '#f2b33d', icon: <BoltIcon size={20} /> },
                { label: 'Точность', value: `${acc}%`, color: '#22a06b', icon: <CheckIcon size={20} className="text-white" /> },
                { label: 'Время', value: `${mm}:${ss}`, color: '#3d7bf7', icon: <span className="text-white">⏱</span> },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.12, type: 'spring', damping: 16 }}
                  className="overflow-hidden rounded-2xl border-2"
                  style={{ borderColor: s.color, background: s.color }}
                >
                  <p className="flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white">{s.label}</p>
                  <p className="flex items-center justify-center gap-1.5 rounded-xl bg-[#fffdf8] py-4 font-display text-xl font-bold" style={{ color: s.color }}>
                    {s.value}
                  </p>
                </motion.div>
              ))}
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-6 flex items-center gap-2 font-semibold text-sky">
              <GemIcon size={20} /> +{outcome.gemsEarned} кристаллов
              {outcome.goalReached && <span className="ml-2 rounded-full bg-gold/30 px-3 py-1 text-sm text-gold-dark">Цель дня выполнена!</span>}
            </motion.p>
          </motion.div>
        )}
        {phase === 'streak' && (
          <motion.div key="s" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -4, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              <FlameIcon size={160} />
            </motion.div>
            <motion.p initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 10 }} className="font-display text-8xl font-black text-[#f08a00]">
              {streak}
            </motion.p>
            <h2 className="font-display text-2xl font-bold">{streak === 1 ? 'Серия началась!' : 'дней подряд!'}</h2>
            <p className="mt-2 max-w-sm text-ink-soft">Занимайся каждый день, чтобы серия не прервалась. Даже 5 минут в день творят чудеса.</p>
          </motion.div>
        )}
        {phase === 'achievements' && (
          <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-red">Новое достижение</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {outcome.newAchievements.map((id, i) => {
                const a = achievements.find((x) => x.id === id)!
                return (
                  <motion.div
                    key={id}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2, duration: 0.8 }}
                    className="w-48 rounded-3xl border-2 border-gold border-b-[6px] bg-[#fffdf8] p-6"
                  >
                    <div className="text-6xl">{a.icon}</div>
                    <p className="mt-3 font-display text-lg font-bold">{a.title}</p>
                    <p className="text-sm text-ink-soft">{a.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button variant="jade" className="w-full max-w-md" onClick={onNext}>
        Продолжить
      </Button>
    </div>
  )
}
