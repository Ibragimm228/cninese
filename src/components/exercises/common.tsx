import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { tokenWord } from '../../data/curriculum'
import { toneColor, toneOf } from '../../lib/pinyin'
import { useApp } from '../../lib/store'

export type ExResult = { ok: boolean; solution?: string; mistakes?: number }

export type ExProps<T> = {
  ex: T
  locked: boolean
  onChange: (r: ExResult | null) => void
}

export function ExTitle({ children, badge }: { children: React.ReactNode; badge?: string }) {
  return (
    <div className="mb-6 md:mb-8">
      {badge && (
        <p className="mb-2 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-plum">
          <span className="size-2 rounded-full bg-plum" /> {badge}
        </p>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-[32px]">{children}</h2>
    </div>
  )
}

export function OptionCard({
  selected,
  state,
  onClick,
  index,
  disabled,
  children,
  className,
}: {
  selected: boolean
  state?: 'correct' | 'wrong' | null
  onClick: () => void
  index?: number
  disabled?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -2 }}
      className={clsx(
        'card3d relative flex items-center gap-3 px-4 py-3.5 text-left',
        selected && !state && '!border-sky !bg-[#e8f0ff] text-sky-dark',
        state === 'correct' && '!border-jade !bg-jade-soft text-jade-dark',
        state === 'wrong' && '!border-wrong !bg-wrong-soft text-wrong-dark shake',
        className,
      )}
    >
      {index !== undefined && (
        <span
          className={clsx(
            'hidden size-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-bold md:grid',
            selected ? 'border-current' : 'border-paper-3 text-ink-soft',
          )}
        >
          {index + 1}
        </span>
      )}
      {children}
    </motion.button>
  )
}

export function useNumberKeys(count: number, onPick: (i: number) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= count) onPick(n - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [count, onPick, enabled])
}

export function Pinyin({ text, className }: { text: string; className?: string }) {
  const single = !text.includes(' ') && text.length <= 7
  return (
    <span className={clsx('font-sans font-medium', className)} style={single ? { color: toneColor(toneOf(text)) } : undefined}>
      {text}
    </span>
  )
}

export function HanziLine({
  tokens,
  blank,
  blankContent,
  size = 'lg',
}: {
  tokens: string[]
  blank?: number
  blankContent?: React.ReactNode
  size?: 'md' | 'lg'
}) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  return (
    <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
      {tokens.map((t, i) => {
        const w = tokenWord(t)
        if (i === blank)
          return (
            <span key={i} className="flex min-w-16 flex-col items-center">
              <span className="text-xs">&nbsp;</span>
              <span
                className={clsx(
                  'min-w-16 border-b-[3px] border-ink px-2 text-center font-hanzi',
                  size === 'lg' ? 'text-3xl md:text-4xl' : 'text-2xl',
                )}
              >
                {blankContent ?? '\u00a0'}
              </span>
            </span>
          )
        return (
          <span key={i} className="group relative flex flex-col items-center">
            {showPinyin && <span className="text-xs text-ink-soft md:text-sm">{w?.pinyin}</span>}
            <span
              className={clsx(
                'cursor-help border-b-2 border-dashed border-paper-3 font-hanzi font-semibold transition-colors hover:border-ink',
                size === 'lg' ? 'text-3xl md:text-4xl' : 'text-2xl',
              )}
            >
              {t}
            </span>
            {w && (
              <span className="pointer-events-none absolute top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-paper opacity-0 transition-opacity group-hover:opacity-100">
                {w.ru}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
