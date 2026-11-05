import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/AppShell'
import { allSentences, allWords } from '../data/curriculum'
import type { Word } from '../data/types'
import { learnedWords } from '../lib/progress'
import { sfx } from '../lib/sounds'
import { hasChineseVoice, speak } from '../lib/speech'
import { useApp } from '../lib/store'

type Q = { section: 'listen' | 'read'; prompt: string; audio?: string; hanzi?: string; options: string[]; answer: number }

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n)

function build(voice: boolean): Q[] {
  const qs: Q[] = []
  const distract = (w: Word, key: 'ru' | 'hanzi') => shuffle([w[key], ...pick(allWords.filter((x) => x.id !== w.id), 3).map((x) => x[key])])
  for (const w of pick(allWords, voice ? 8 : 0)) {
    const options = distract(w, 'hanzi')
    qs.push({ section: 'listen', prompt: 'Прослушай и выбери услышанное слово', audio: w.hanzi, options, answer: options.indexOf(w.hanzi) })
  }
  for (const s of pick(allSentences, voice ? 4 : 0)) {
    const others = pick(allSentences.filter((x) => x.id !== s.id), 3).map((x) => x.ru)
    const options = shuffle([s.ru, ...others])
    qs.push({ section: 'listen', prompt: 'Прослушай фразу и выбери перевод', audio: s.tokens.join(''), options, answer: options.indexOf(s.ru) })
  }
  for (const w of pick(allWords, 10)) {
    const options = distract(w, 'ru')
    qs.push({ section: 'read', prompt: 'Что означает это слово?', hanzi: w.hanzi, options, answer: options.indexOf(w.ru) })
  }
  for (const s of pick(allSentences, 6)) {
    const others = pick(allSentences.filter((x) => x.id !== s.id), 3).map((x) => x.ru)
    const options = shuffle([s.ru, ...others])
    qs.push({ section: 'read', prompt: 'Прочитай и выбери перевод', hanzi: s.tokens.join(''), options, answer: options.indexOf(s.ru) })
  }
  return qs
}

export default function Exam() {
  const state = useApp()
  const known = learnedWords(state).length
  const coverage = Math.round((known / allWords.length) * 100)
  const [run, setRun] = useState(0)
  const [started, setStarted] = useState(false)
  const questions = useMemo(() => build(hasChineseVoice()), [run]) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const done = started && i >= questions.length
  const correct = answers.filter((a, k) => a === questions[k]?.answer).length
  const score = Math.round((correct / Math.max(1, questions.length)) * 200)
  const forecast = Math.min(99, Math.round(coverage * 0.6 + (state.stats.lessonsCompleted ?? 0) * 0.8))

  const q = questions[i]
  const choose = (k: number) => {
    if (picked !== null) return
    setPicked(k)
    if (k === q.answer) sfx.correct()
    else sfx.wrong()
    setTimeout(() => {
      setAnswers((a) => [...a, k])
      setPicked(null)
      setI((x) => x + 1)
      const nq = questions[i + 1]
      if (nq?.audio) void speak(nq.audio)
    }, 900)
  }

  if (!started)
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-8 md:pt-10">
        <PageHeader kicker="Цель — реальный сертификат" title="Пробный HSK 1" />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative overflow-hidden rounded-[32px] bg-ink p-8 text-paper md:p-10">
            <span className="pointer-events-none absolute -right-6 -top-10 font-brush text-[220px] leading-none text-red/25">考</span>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Формат как на экзамене</p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight md:text-4xl">Аудирование + чтение. 200 баллов, проходной — 120.</h2>
            <ul className="mt-6 space-y-2 text-paper/70">
              <li>· {hasChineseVoice() ? '12 заданий на аудирование' : 'Аудирование недоступно — нет китайского голоса'}</li>
              <li>· 16 заданий на чтение</li>
              <li>· Без сердец и подсказок — как в настоящем зале</li>
            </ul>
            <button
              onClick={() => {
                setStarted(true)
                if (questions[0]?.audio) void speak(questions[0].audio)
              }}
              className="btn3d mt-8 bg-red px-8 py-4 text-white [--shadow:#a3241a]"
            >
              Начать тест
            </button>
          </div>
          <div className="rounded-[32px] border-2 border-paper-3 bg-[#fffdf8] p-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">Прогноз готовности</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-7xl font-bold text-jade">{forecast}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper-3">
              <motion.div className="h-full rounded-full bg-jade" initial={{ width: 0 }} animate={{ width: `${forecast}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <p className="mt-4 text-ink-soft">
              Ты знаешь {known} из {allWords.length} слов HSK 1 ({coverage}%). Прогноз растёт с каждым уроком и повторением.
            </p>
            <Link to="/learn" className="mt-6 inline-block font-display text-sm font-bold uppercase tracking-wider text-red">
              Продолжить курс →
            </Link>
          </div>
        </div>
      </div>
    )

  if (done)
    return (
      <div className="mx-auto max-w-2xl px-4 pt-16 text-center">
        <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('font-display text-8xl font-bold', score >= 120 ? 'text-jade' : 'text-red')}>
          {score}
        </motion.p>
        <p className="mt-2 font-display text-2xl font-bold">{score >= 120 ? 'Экзамен сдан! 及格' : 'Пока не хватает до 120'}</p>
        <p className="mt-2 text-ink-soft">
          Верно {correct} из {questions.length}. {score >= 120 ? 'Можно регистрироваться на настоящий HSK 1.' : 'Пройди ещё пару юнитов и попробуй снова.'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => { setRun((r) => r + 1); setI(0); setAnswers([]); setStarted(false) }} className="btn3d bg-ink px-6 py-3 text-paper [--shadow:#000]">
            Ещё раз
          </button>
          <Link to="/learn" className="btn3d bg-red px-6 py-3 text-white [--shadow:#a3241a]">
            К урокам
          </Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 md:pt-12">
      <div className="mb-8 flex items-center gap-4">
        <span className="font-display text-xs font-bold uppercase tracking-widest text-ink-soft">{q.section === 'listen' ? '听力 Аудирование' : '阅读 Чтение'}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
          <motion.div className="h-full bg-red" animate={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="font-display text-sm font-bold">{i + 1}/{questions.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
          <h2 className="font-display text-2xl font-bold">{q.prompt}</h2>
          <div className="my-8 grid place-items-center">
            {q.audio ? (
              <button onClick={() => void speak(q.audio!)} className="btn3d grid size-28 place-items-center bg-sky text-white [--shadow:#2556c4]"><svg viewBox="0 0 24 24" className="size-12" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-9v2.06a7 7 0 0 1 0 13.88V21a9 9 0 0 0 0-18Z" /></svg></button>
            ) : (
              <span className="font-hanzi text-5xl font-semibold md:text-6xl">{q.hanzi}</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <button
                key={k}
                onClick={() => choose(k)}
                className={clsx(
                  'card3d px-5 py-4 text-left text-lg font-semibold transition-colors',
                  picked !== null && k === q.answer && 'border-jade! bg-jade/10',
                  picked === k && k !== q.answer && 'border-wrong! bg-wrong/10',
                  /\p{Script=Han}/u.test(o) && 'font-hanzi text-2xl',
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
