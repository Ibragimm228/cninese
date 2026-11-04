import { useRef, useState } from 'react'
import type { Exercise } from '../../lib/exercises'
import { useApp } from '../../lib/store'
import { HanziWriterBox, type HanziWriterHandle } from '../HanziWriterBox'
import { SpeakButton } from '../SpeakButton'
import { ExTitle, Pinyin, type ExProps } from './common'

export function WriteEx({ ex, onChange }: ExProps<Extract<Exercise, { type: 'write' }>>) {
  const w = ex.word
  const addStat = useApp((s) => s.addStat)
  const ref = useRef<HanziWriterHandle>(null)
  const [mistakes, setMistakes] = useState(0)
  const [complete, setComplete] = useState(false)
  const [size] = useState(() => Math.min(300, window.innerWidth - 64))
  return (
    <div>
      <ExTitle badge="Письмо">Нарисуй иероглиф по чертам</ExTitle>
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
        <div className="rounded-[28px] border-2 border-paper-3 border-b-[6px] bg-[#fffdf8] p-3">
          <HanziWriterBox
            ref={ref}
            char={w.hanzi}
            size={size}
            mode="quiz"
            onMistake={() => setMistakes((m) => m + 1)}
            onQuizComplete={(m) => {
              setComplete(true)
              addStat('charsWritten')
              onChange({ ok: true, mistakes: m })
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="flex items-center gap-3">
            <SpeakButton text={w.hanzi} size="md" />
            <div>
              <Pinyin text={w.pinyin} className="text-2xl" />
              <p className="font-display text-lg font-semibold">{w.ru}</p>
            </div>
          </div>
          <p className="max-w-xs text-sm text-ink-soft">
            Проводи черты пальцем или мышью в правильном порядке: сверху вниз, слева направо. После двух ошибок появится подсказка.
          </p>
          {!complete && (
            <p className="text-sm font-semibold text-ink-soft">
              Ошибок: <span className={mistakes ? 'text-wrong' : ''}>{mistakes}</span>
            </p>
          )}
          {!complete && (
            <div className="flex gap-2">
              <button type="button" onClick={() => ref.current?.demo()} className="rounded-xl border-2 border-paper-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft hover:border-ink hover:text-ink">
                Показать
              </button>
              <button
                type="button"
                onClick={() => {
                  setComplete(true)
                  onChange({ ok: true, mistakes: 0 })
                }}
                className="rounded-xl border-2 border-paper-3 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft hover:border-ink hover:text-ink"
              >
                Не могу писать сейчас
              </button>
            </div>
          )}
          {complete && <p className="font-display text-lg font-bold text-jade">Отлично написано!</p>}
        </div>
      </div>
    </div>
  )
}
