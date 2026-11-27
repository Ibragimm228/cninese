import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/AppShell'
import { SpeakerIcon } from '../components/icons'
import { hskLevels } from '../data/curriculum'
import type { HskLevel } from '../data/types'
import { buildExam, examScale, examScore, examVocabulary, type ExamQuestion } from '../lib/exam'
import { hasChineseVoice, speak } from '../lib/speech'
import { useApp } from '../lib/store'
import { session, submitExamResult, syncAvailable } from '../lib/sync'

const sections = { listen: '听力 Аудирование', read: '阅读 Чтение', write: '书写 Письмо' }

export default function Exam() {
  const words = useApp((s) => s.words)
  const [level, setLevel] = useState<HskLevel>(1)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [written, setWritten] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const answerCount = useRef(0)
  const voice = hasChineseVoice()
  const vocabulary = examVocabulary(level)
  const known = vocabulary.filter((w) => (words[w.id]?.correct ?? 0) > 0).length
  const coverage = Math.round((known / vocabulary.length) * 100)
  const { max, pass } = examScale[level]
  const started = questions.length > 0
  const done = started && answers.length === questions.length
  const correct = answers.filter((a, index) => a === questions[index].answer).length
  const score = examScore(level, questions, answers)
  const full = questions.some((q) => q.section === 'listen')
  const q = questions[answers.length]
  const audio = q && 'audio' in q ? q.audio : undefined

  useEffect(() => {
    if (audio) void speak(audio)
  }, [audio, answers.length])

  const choose = (answer: string) => {
    if (answerCount.current !== answers.length || !q || !answer.trim()) return
    answerCount.current++
    const next = [...answers, answer.trim()]
    setAnswers(next)
    setWritten('')
    if (next.length === questions.length && syncAvailable && session()) {
      setSaveStatus('saving')
      void submitExamResult(level, examScore(level, questions, next)).then(
        () => setSaveStatus('saved'),
        () => setSaveStatus('failed'),
      )
    }
  }

  if (!started)
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-8 md:pt-10">
        <PageHeader title="Пробный HSK" />
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Уровень HSK">
          {hskLevels.map((value) => (
            <button type="button" key={value} aria-pressed={level === value} onClick={() => setLevel(value)}
              className={clsx('rounded-full border border-paper-3 px-4 py-2 text-sm font-bold', level === value ? 'bg-ink text-paper' : 'bg-card text-ink-soft')}>
              HSK {value}
            </button>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="exam-hero relative overflow-hidden rounded-[32px] bg-ink p-8 text-paper md:p-10">
            <span className="pointer-events-none absolute -right-6 -top-10 font-brush text-[220px] leading-none text-red/25">考</span>
            <h2 className="max-w-md font-display text-3xl font-bold leading-tight md:text-4xl">{max} баллов, проходной {pass}</h2>
            <ul className="mt-6 space-y-2 text-paper/70">
              <li>{voice ? '12 заданий на аудирование' : 'Аудирование недоступно без китайского голоса'}</li>
              <li>16 заданий на чтение</li>
              {level === 3 && <li>6 заданий с вводом иероглифов</li>}
            </ul>
            <button
              onClick={() => setQuestions(buildExam(level, hasChineseVoice()))}
              className="btn3d mt-8 bg-red px-8 py-4 text-white [--shadow:#a3241a]"
            >
              Начать тест
            </button>
          </div>
          <div className="rounded-[32px] border-2 border-paper-3 bg-card p-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">Охват лексики</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-7xl font-bold text-jade">{coverage}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper-3">
              <motion.div className="h-full rounded-full bg-jade" initial={{ width: 0 }} animate={{ width: `${coverage}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <p className="mt-4 text-ink-soft">{known} / {vocabulary.length} слов · {coverage}%</p>
            <Link to="/learn" className="mt-6 inline-block font-display text-sm font-bold uppercase tracking-wider text-red">
              Продолжить курс
            </Link>
          </div>
        </div>
      </div>
    )

  if (done)
    return (
      <div className="mx-auto max-w-2xl px-4 pt-16 text-center">
        <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={clsx('font-display text-8xl font-bold', score >= pass ? 'text-jade' : 'text-red')}>
          {score}
        </motion.p>
        <p className="mt-2 font-display text-2xl font-bold">{score >= pass ? 'Пробный тест сдан' : `Пока не хватает до ${pass}`}</p>
        <p className="mt-2 text-ink-soft">
          HSK {level} · {score}/{max} · Верно {correct} из {questions.length}.
        </p>
        {!full && <p className="mt-2 text-sm text-ink-soft">Результат пробной версии без аудирования.</p>}
        {saveStatus !== 'idle' && <p role="status" className="mt-2 text-sm text-ink-soft">{saveStatus === 'saving' ? 'Сохраняем результат…' : saveStatus === 'saved' ? 'Результат сохранён.' : 'Не удалось сохранить результат.'}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button disabled={saveStatus === 'saving'} onClick={() => { answerCount.current = 0; setQuestions([]); setAnswers([]); setSaveStatus('idle') }} className="btn3d bg-ink px-6 py-3 text-paper [--shadow:#000]">
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
        <span className="font-display text-xs font-bold uppercase tracking-widest text-ink-soft">{sections[q.section]}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
          <motion.div className="h-full bg-red" animate={{ width: `${(answers.length / questions.length) * 100}%` }} />
        </div>
        <span className="font-display text-sm font-bold">{answers.length + 1}/{questions.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={answers.length} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
          <h2 className="font-display text-2xl font-bold">{q.prompt}</h2>
          <div className="my-8 grid place-items-center">
            {audio ? (
              <button type="button" aria-label="Прослушать задание" onClick={() => void speak(audio)} className="btn3d grid size-28 place-items-center bg-sky text-white [--shadow:#2556c4]"><SpeakerIcon size={48} /></button>
            ) : (
              <span className="font-hanzi text-center text-4xl font-semibold md:text-5xl">{q.hanzi}</span>
            )}
          </div>
          {q.section === 'write' ? (
            <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); choose(written) }}>
              <label htmlFor="exam-writing" className="text-ink-soft">{q.hint}</label>
              <input id="exam-writing" autoComplete="off" value={written} onChange={(event) => setWritten(event.target.value)} className="rounded-2xl border border-paper-3 bg-card px-4 py-3 font-hanzi text-xl" />
              <button className="btn3d bg-red px-5 py-3 text-white [--shadow:#a3241a]" disabled={!written.trim()}>Ответить</button>
            </form>
          ) : <div className="grid gap-3 sm:grid-cols-2">
            {q.options.map((o) => (
              <button
                key={o}
                onClick={() => choose(o)}
                className={clsx(
                  'card3d px-5 py-4 text-left text-lg font-semibold transition-colors',
                  /\p{Script=Han}/u.test(o) && 'font-hanzi text-2xl',
                )}
              >
                {o}
              </button>
            ))}
          </div>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
