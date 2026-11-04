import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { TONE_INFO, applyTone } from '../lib/pinyin'
import { contour, recordPitch, referenceContour, scoreContour } from '../lib/pitch'
import { sfx } from '../lib/sounds'
import { speak } from '../lib/speech'
import { useApp } from '../lib/store'

const TARGETS = [
  { base: 'ma', hanzi: ['妈', '麻', '马', '骂'] },
  { base: 'shi', hanzi: ['诗', '十', '使', '是'] },
  { base: 'tang', hanzi: ['汤', '糖', '躺', '烫'] },
]

const W = 520
const H = 220
const toXY = (p: { x: number; y: number }) => [24 + p.x * (W - 48), H / 2 - p.y * (H / 2 - 22)] as const
const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${toXY(p).join(' ')}`).join(' ')

export function PitchTrainer({ dark = true, header = true }: { dark?: boolean; header?: boolean }) {
  const addStat = useApp((s) => s.addStat)
  const [set, setSet] = useState(0)
  const [tone, setTone] = useState(3)
  const [state, setState] = useState<'idle' | 'rec' | 'done' | 'error'>('idle')
  const [live, setLive] = useState<number[]>([])
  const [user, setUser] = useState<{ x: number; y: number }[]>([])
  const [result, setResult] = useState<{ best: number | null; score: number } | null>(null)
  const abort = useRef<AbortController | null>(null)
  const info = TONE_INFO[tone - 1]
  const hanzi = TARGETS[set].hanzi[tone - 1]
  const syll = applyTone(TARGETS[set].base, tone)
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const record = async () => {
    if (state === 'rec') return abort.current?.abort()
    setState('rec')
    setLive([])
    setUser([])
    setResult(null)
    abort.current = new AbortController()
    try {
      const frames = await recordPitch(1600, (f) => setLive((l) => [...l.slice(-80), f.level]), abort.current.signal)
      const c = contour(frames)
      setUser(c)
      const r = scoreContour(c, tone)
      setResult(r)
      setState('done')
      if (r.score >= 60) {
        sfx.correct()
        addStat('tonesCorrect')
      } else sfx.wrong()
    } catch {
      setState('error')
    }
  }

  const ref = referenceContour(tone)
  const verdict = !result
    ? null
    : result.score >= 80
      ? 'Как у носителя!'
      : result.score >= 60
        ? 'Хорошо, почти идеально'
        : user.length < 4
          ? 'Не расслышал — скажи громче и ближе к микрофону'
          : result.best && result.best !== tone
            ? `Похоже на ${result.best}-й тон. Попробуй ещё раз`
            : 'Мелодия пока не та — послушай эталон'

  return (
    <div className={clsx('relative overflow-hidden rounded-[32px] p-6 md:p-10', dark ? 'bg-ink text-paper' : 'border-2 border-paper-3 bg-[#fffdf8]')}>
      <div className={clsx('flex flex-wrap items-end gap-4', header ? 'justify-between' : 'justify-end')}>
        <div className={clsx(!header && 'hidden')}>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Только в Mòlì · микрофон</p>
          <h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">Зеркало тона</h2>
          <p className={clsx('mt-2 max-w-md', dark ? 'text-paper/60' : 'text-ink-soft')}>
            Скажи слог, и мы нарисуем мелодию твоего голоса поверх эталона. Сразу видно, где тон «съехал».
          </p>
        </div>
        <div className="flex gap-2">
          {TARGETS.map((t, i) => (
            <button key={t.base} onClick={() => setSet(i)} className={clsx('rounded-xl border-2 px-4 py-1.5 font-semibold', set === i ? 'border-gold bg-gold text-ink' : dark ? 'border-white/15 hover:border-white/50' : 'border-paper-3')}>
              {t.base}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className={clsx('relative rounded-3xl p-3', dark ? 'bg-white/[0.04]' : 'bg-paper-2')}>
          <svg viewBox={`0 0 ${W} ${H}`} className="max-h-[300px] w-full">
            {[-0.66, 0, 0.66].map((y) => (
              <line key={y} x1={24} x2={W - 24} y1={H / 2 - y * (H / 2 - 22)} y2={H / 2 - y * (H / 2 - 22)} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="4 6" />
            ))}
            <motion.path key={`ref-${tone}`} d={path(ref)} fill="none" stroke={info.color} strokeOpacity={0.35} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
            {user.length > 3 && (
              <motion.path d={path(user)} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
            )}
            {state === 'rec' && (
              <g>
                {live.map((l, i) => (
                  <rect key={i} x={24 + i * ((W - 48) / 80)} y={H / 2 - Math.min(90, l * 900)} width={3} height={Math.min(180, l * 1800)} rx={1.5} fill={info.color} opacity={0.8} />
                ))}
              </g>
            )}
          </svg>
          <div className="absolute left-5 top-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
            <span className="h-1.5 w-5 rounded-full" style={{ background: info.color }} /> эталон
            <span className="ml-3 h-1 w-5 rounded-full bg-current" /> твой голос
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 lg:w-60">
          <div className="flex gap-1.5">
            {TONE_INFO.map((t) => (
              <button key={t.n} onClick={() => { setTone(t.n); setUser([]); setResult(null); setState('idle') }} className={clsx('grid size-11 place-items-center rounded-xl border-2 font-display font-bold transition-colors', tone === t.n ? 'text-white' : dark ? 'border-white/15' : 'border-paper-3')} style={tone === t.n ? { background: t.color, borderColor: t.color } : undefined}>
                {t.n}
              </button>
            ))}
          </div>
          <button onClick={() => void speak(hanzi, 0.6)} className="text-center">
            <span className="block font-hanzi text-6xl font-semibold">{hanzi}</span>
            <span className="mt-1 block font-sans text-2xl font-semibold" style={{ color: info.color }}>{syll}
              <svg viewBox="0 0 24 24" className="ml-1.5 inline size-5 align-[-2px]" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" /></svg>
            </span>
          </button>
          <button
            onClick={() => void record()}
            disabled={!supported}
            className={clsx('relative grid size-20 place-items-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40', state === 'rec' ? 'bg-wrong' : 'bg-red')}
            aria-label="Записать"
          >
            {state === 'rec' && <span className="absolute inset-0 animate-ping rounded-full bg-wrong/50" />}
            <svg viewBox="0 0 24 24" className="relative size-8" fill="currentColor">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
            </svg>
          </button>
          <p className={clsx('text-center text-sm', dark ? 'text-paper/60' : 'text-ink-soft')}>
            {!supported ? 'Микрофон недоступен в этом браузере' : state === 'rec' ? 'Говори…' : state === 'error' ? 'Нет доступа к микрофону' : 'Нажми и скажи слог'}
          </p>
        </div>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 flex items-center gap-5">
            <div className="relative size-16">
              <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth="4" />
                <motion.circle cx="18" cy="18" r="15" fill="none" stroke={result.score >= 60 ? '#22a06b' : '#f2b33d'} strokeWidth="4" strokeLinecap="round" strokeDasharray={94.2} initial={{ strokeDashoffset: 94.2 }} animate={{ strokeDashoffset: 94.2 * (1 - result.score / 100) }} transition={{ duration: 1 }} />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold">{result.score}</span>
            </div>
            <p className="font-display text-xl font-bold">{verdict}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
