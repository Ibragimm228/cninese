import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '../../lib/exercises'
import { listenOnce, matchesSpeech, type Heard } from '../../lib/recognition'
import { useApp } from '../../lib/store'
import { SpeakButton } from '../SpeakButton'
import { ExTitle, type ExProps } from './common'

const PROBLEMS = { denied: 'Нет доступа к микрофону', silent: 'Ничего не слышно', failed: 'Не удалось распознать' }

export function SpeakEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'speak' }>>) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<Heard | null>(null)
  const session = useRef<{ stop: () => void } | null>(null)
  useEffect(() => () => session.current?.stop(), [])

  const ok = !!heard && matchesSpeech(heard.alternatives, ex.hanzi, ex.pinyin)
  const record = async () => {
    if (locked) return
    if (listening) return session.current?.stop()
    window.speechSynthesis?.cancel()
    onChange(null)
    setHeard(null)
    const s = listenOnce()
    session.current = s
    setListening(true)
    const result = await s.result
    if (session.current !== s) return
    session.current = null
    setListening(false)
    setHeard(result)
    onChange(result.error ? null : { ok: matchesSpeech(result.alternatives, ex.hanzi, ex.pinyin), solution: `${ex.hanzi} (${ex.pinyin})` })
  }

  return (
    <div>
      <ExTitle badge="Говорение">Скажи вслух</ExTitle>
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <p className="font-hanzi text-5xl font-semibold md:text-6xl">{ex.hanzi}</p>
        {(showPinyin || locked) && <p className="text-lg text-ink-soft">{ex.pinyin}</p>}
        <p className="text-ink-soft">{ex.ru}</p>
        <SpeakButton text={ex.hanzi} size="md" className="mt-2" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <motion.button
          type="button"
          disabled={locked}
          onClick={record}
          whileTap={{ scale: 0.94 }}
          animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={listening ? { repeat: Infinity, duration: 1.1 } : undefined}
          aria-pressed={listening}
          aria-label={listening ? 'Остановить запись' : 'Говорить'}
          className={clsx('grid size-28 place-items-center rounded-full text-white transition-colors disabled:opacity-60', listening ? 'bg-wrong' : 'bg-sky')}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </motion.button>
        <p className="min-h-12 text-center" aria-live="polite">
          {listening ? (
            <span className="text-ink-soft">Слушаю…</span>
          ) : heard?.error ? (
            <span className="font-semibold text-wrong-dark">{PROBLEMS[heard.error]}</span>
          ) : heard ? (
            <>
              <span className="text-sm text-ink-soft">Я услышал</span>
              <br />
              <span className={clsx('font-hanzi text-2xl font-semibold', ok ? 'text-jade-dark' : 'text-wrong-dark')}>{heard.alternatives[0]}</span>
            </>
          ) : (
            <span className="text-ink-soft">Нажми и говори</span>
          )}
        </p>
        {!locked && !listening && (
          <button type="button" className="text-sm font-semibold text-ink-soft underline underline-offset-4" onClick={() => onChange({ ok: true, skipped: true })}>
            Сейчас не могу говорить
          </button>
        )}
      </div>
    </div>
  )
}
