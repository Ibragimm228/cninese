import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '../../lib/exercises'
import { shuffle } from '../../lib/exercises'
import { speak } from '../../lib/speech'
import { sfx } from '../../lib/sounds'
import { useApp } from '../../lib/store'
import { ExTitle, type ExProps } from './common'

type Side = 'zh' | 'ru'

export function MatchEx({ ex, onChange }: ExProps<Extract<Exercise, { type: 'match' }>>) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const rate = useApp((s) => s.settings.speechRate)
  const left = useMemo(() => shuffle(ex.words), [ex])
  const right = useMemo(() => shuffle(ex.words), [ex])
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const mistakes = useRef(0)

  useEffect(() => {
    if (done.length === ex.words.length) onChange({ ok: true, mistakes: mistakes.current })
  }, [done, ex.words.length, onChange])

  const tap = (side: Side, id: string) => {
    if (done.includes(id)) return
    if (side === 'zh') void speak(ex.words.find((w) => w.id === id)!.hanzi, rate)
    if (!sel || sel.side === side) {
      sfx.tap()
      setSel({ side, id })
      return
    }
    if (sel.id === id) {
      sfx.combo()
      setDone((d) => [...d, id])
    } else {
      sfx.wrong()
      mistakes.current++
      const pair = [`${sel.side}-${sel.id}`, `${side}-${id}`]
      setWrong(pair)
      setTimeout(() => setWrong([]), 500)
    }
    setSel(null)
  }

  const cell = (side: Side, id: string, content: React.ReactNode) => {
    const isDone = done.includes(id)
    const isSel = sel?.side === side && sel.id === id
    const isWrong = wrong.includes(`${side}-${id}`)
    return (
      <motion.button
        key={`${side}-${id}`}
        type="button"
        disabled={isDone}
        onClick={() => tap(side, id)}
        animate={isDone ? { opacity: 0.35, scale: 0.97 } : { opacity: 1, scale: 1 }}
        className={clsx(
          'card3d flex min-h-[68px] items-center justify-center px-3 py-2 text-center',
          isSel && '!border-sky !bg-[#e8f0ff] text-sky-dark',
          isWrong && '!border-wrong !bg-wrong-soft text-wrong-dark shake',
          isDone && '!border-jade !bg-jade-soft text-jade-dark',
        )}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <div>
      <ExTitle>Найди пары</ExTitle>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="flex flex-col gap-3">
          {left.map((w) =>
            cell(
              'zh',
              w.id,
              <span className="flex flex-col">
                <span className="font-hanzi text-2xl font-semibold">{w.hanzi}</span>
                {showPinyin && <span className="text-xs text-ink-soft">{w.pinyin}</span>}
              </span>,
            ),
          )}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((w) => cell('ru', w.id, <span className="text-[15px] font-semibold md:text-base">{w.ru}</span>))}
        </div>
      </div>
    </div>
  )
}
