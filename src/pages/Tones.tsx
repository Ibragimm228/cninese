import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/AppShell'
import { Button } from '../components/Button'
import { SpeakButton } from '../components/SpeakButton'
import { allWords } from '../data/curriculum'
import type { Word } from '../data/types'
import { isSingleSyllable, shuffle } from '../lib/exercises'
import { TONE_INFO, applyTone, toneOf } from '../lib/pinyin'
import { sfx } from '../lib/sounds'
import { hasChineseVoice, speak } from '../lib/speech'
import { useApp } from '../lib/store'

const SYLLABLES = [
  { base: 'ma', hanzi: ['妈', '麻', '马', '骂'], ru: ['мама', 'конопля', 'лошадь', 'ругать'] },
  { base: 'shi', hanzi: ['诗', '十', '使', '是'], ru: ['стих', 'десять', 'использовать', 'являться'] },
  { base: 'tang', hanzi: ['汤', '糖', '躺', '烫'], ru: ['суп', 'сахар', 'лежать', 'горячий'] },
  { base: 'yi', hanzi: ['一', '姨', '椅', '亿'], ru: ['один', 'тётя', 'стул', 'сто миллионов'] },
]

export default function Tones() {
  const [syl, setSyl] = useState(0)
  const s = SYLLABLES[syl]
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-8 md:pt-10">
      <PageHeader kicker="声调 · Фонетика" title="Тоны" />
      <p className="-mt-4 mb-10 max-w-2xl text-lg text-ink-soft">
        Тон — это мелодия слога. Один и тот же слог с разным тоном — совершенно разные слова. Послушай и повтори вслух.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {SYLLABLES.map((x, i) => (
          <button key={x.base} onClick={() => setSyl(i)} className={clsx('rounded-2xl border-2 px-5 py-2 font-sans text-lg font-semibold', syl === i ? 'border-ink bg-ink text-paper' : 'border-paper-3 hover:border-ink')}>
            {x.base}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {TONE_INFO.map((t, i) => (
          <motion.button
            key={`${s.base}-${t.n}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            onClick={() => void speak(s.hanzi[i], 0.7)}
            className="card3d flex flex-col items-center p-5"
          >
            <svg viewBox="0 0 100 90" className="h-16 w-full">
              <path d="M5 14 H95 M5 76 H95" stroke="#e0d7c5" strokeWidth="1.5" strokeDasharray="4 4" />
              <motion.path d={t.path} stroke={t.color} strokeWidth="9" strokeLinecap="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} />
            </svg>
            <span className="mt-3 font-sans text-4xl font-semibold" style={{ color: t.color }}>{applyTone(s.base, t.n)}</span>
            <span className="mt-1 font-hanzi text-3xl font-semibold">{s.hanzi[i]}</span>
            <span className="text-sm text-ink-soft">{s.ru[i]}</span>
            <span className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-soft">{t.n}-й · {t.short}</span>
          </motion.button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {TONE_INFO.map((t) => (
          <div key={t.n} className="flex items-start gap-3 rounded-2xl bg-paper-2 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl font-display font-bold text-white" style={{ background: t.color }}>{t.n}</span>
            <p className="text-ink-2"><b>{t.name} тон</b> — {t.desc}</p>
          </div>
        ))}
        <div className="flex items-start gap-3 rounded-2xl bg-paper-2 p-4 md:col-span-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-soft font-display font-bold text-white">5</span>
          <p className="text-ink-2"><b>Нейтральный тон</b> — короткий и лёгкий, без знака над гласной: 吗 ma, 呢 ne, 的 de. Правило: два третьих тона подряд → первый читается как второй (你好 ní hǎo).</p>
        </div>
      </div>

      <ToneQuiz />
    </div>
  )
}

function ToneQuiz() {
  const addStat = useApp((s) => s.addStat)
  const voice = hasChineseVoice()
  const pool = allWords.filter(isSingleSyllable).filter((w) => toneOf(w.pinyin) !== 5)
  const [word, setWord] = useState<Word>(() => shuffle(pool)[0])
  const [answer, setAnswer] = useState<number | null>(null)
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 })
  const [audioMode, setAudioMode] = useState(voice)
  const correct = toneOf(word.pinyin)

  const nextWord = useCallback(() => {
    setAnswer(null)
    setWord(shuffle(pool.filter((w) => w.id !== word.id))[0])
  }, [pool, word])

  useEffect(() => {
    if (audioMode) void speak(word.hanzi, 0.75)
  }, [word, audioMode])

  const pick = (t: number) => {
    if (answer !== null) return
    setAnswer(t)
    const ok = t === correct
    if (ok) {
      sfx.correct()
      addStat('tonesCorrect')
    } else sfx.wrong()
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }))
  }

  return (
    <section className="relative mt-14 overflow-hidden rounded-[32px] bg-ink p-6 text-paper md:p-10">
      <span className="pointer-events-none absolute -right-8 -top-10 font-brush text-[200px] leading-none text-white/5">听</span>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Тренажёр</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Угадай тон</h2>
        </div>
        <div className="flex items-center gap-4 font-display text-sm">
          <span>Верно: <b className="text-jade">{score.ok}</b>/{score.total}</span>
          <span>Серия: <b className="text-gold">{score.streak}</b></span>
          {voice && (
            <button onClick={() => setAudioMode(!audioMode)} className="rounded-xl border-2 border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:border-white">
              {audioMode ? 'Режим: на слух' : 'Режим: по иероглифу'}
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-8 flex flex-col items-center gap-6 md:flex-row md:gap-10">
        <div className="flex flex-col items-center">
          {audioMode && answer === null ? (
            <SpeakButton text={word.hanzi} size="xl" />
          ) : (
            <span className="font-hanzi text-8xl font-semibold">{word.hanzi}</span>
          )}
          <p className="mt-3 text-paper/60">{answer !== null || !audioMode ? word.ru : 'Послушай слог'}</p>
        </div>
        <div className="grid w-full flex-1 grid-cols-2 gap-3 md:grid-cols-4">
          {TONE_INFO.map((t) => {
            const state = answer === null ? null : t.n === correct ? 'ok' : answer === t.n ? 'bad' : null
            return (
              <button
                key={t.n}
                onClick={() => pick(t.n)}
                className={clsx('flex flex-col items-center rounded-2xl border-2 p-4 transition-colors', state === 'ok' ? 'border-jade bg-jade/20' : state === 'bad' ? 'shake border-wrong bg-wrong/20' : 'border-white/15 hover:border-white/50')}
              >
                <svg viewBox="0 0 100 90" className="h-10 w-16">
                  <path d={t.path} stroke={t.color} strokeWidth="10" strokeLinecap="round" fill="none" />
                </svg>
                <span className="mt-2 font-sans text-2xl font-semibold">{applyTone(word.pinyin, t.n)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <AnimatePresence>
        {answer !== null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative mt-6 flex justify-end">
            <Button variant={answer === correct ? 'jade' : 'gold'} onClick={nextWord}>
              Дальше
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
