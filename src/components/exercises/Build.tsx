import clsx from 'clsx'
import { LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { tokenWord } from '../../data/curriculum'
import type { Exercise } from '../../lib/exercises'
import { speak } from '../../lib/speech'
import { sfx } from '../../lib/sounds'
import { useApp } from '../../lib/store'
import { SpeakButton } from '../SpeakButton'
import { ExTitle, HanziLine, type ExProps } from './common'

export function BuildEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'build' }>>) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const rate = useApp((s) => s.settings.speechRate)
  const tiles = useMemo(() => ex.tiles.map((t, i) => ({ id: `${ex.key}-${i}`, text: t })), [ex])
  const [picked, setPicked] = useState<string[]>([])
  const zh = ex.direction !== 'zh-ru'
  const text = ex.sentence.tokens.join('')

  useEffect(() => {
    if (ex.direction !== 'ru-zh') {
      const t = setTimeout(() => void speak(text, rate), 300)
      return () => clearTimeout(t)
    }
  }, [ex, text, rate])

  useEffect(() => {
    if (!picked.length) return onChange(null)
    const words = picked.map((id) => tiles.find((t) => t.id === id)!.text)
    const norm = (a: string[]) => a.join(' ').toLowerCase()
    const ok = norm(words) === norm(ex.answer)
    onChange({ ok, solution: zh ? `${text} — ${ex.sentence.ru}` : ex.sentence.ru })
  }, [picked, tiles, ex, onChange, zh, text])

  const toggle = (id: string) => {
    if (locked) return
    sfx.tap()
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      const t = tiles.find((x) => x.id === id)!
      if (zh && tokenWord(t.text)) void speak(t.text, rate)
      return [...p, id]
    })
  }

  const Tile = ({ id, textValue }: { id: string; textValue: string }) => {
    const w = zh ? tokenWord(textValue) : undefined
    return (
      <motion.button
        layoutId={id}
        type="button"
        onClick={() => toggle(id)}
        transition={{ type: 'spring', damping: 26, stiffness: 420 }}
        className={clsx(
          'card3d flex flex-col items-center px-3.5 py-2',
          zh ? 'min-w-12' : 'text-[17px] font-semibold',
        )}
      >
        {zh ? (
          <>
            {showPinyin && <span className="text-[11px] leading-tight text-ink-soft">{w?.pinyin ?? ''}</span>}
            <span className="font-hanzi text-2xl font-semibold leading-tight">{textValue}</span>
          </>
        ) : (
          textValue
        )}
      </motion.button>
    )
  }

  return (
    <div>
      <ExTitle badge={ex.direction === 'listen' ? 'Аудирование' : undefined}>
        {ex.direction === 'listen' ? 'Собери то, что услышал' : 'Переведи предложение'}
      </ExTitle>

      <div className="mb-6 flex items-start gap-4">
        {ex.direction === 'listen' ? (
          <div className="flex items-end gap-3">
            <SpeakButton text={text} size="lg" />
            <SpeakButton text={text} size="md" slow />
          </div>
        ) : ex.direction === 'zh-ru' ? (
          <>
            <SpeakButton text={text} size="md" />
            <div className="relative rounded-2xl border-2 border-paper-3 bg-[#fffdf8] px-5 py-3">
              <span className="absolute -left-[9px] top-5 size-4 rotate-45 border-b-2 border-l-2 border-paper-3 bg-[#fffdf8]" />
              <HanziLine tokens={ex.sentence.tokens} size="md" />
            </div>
          </>
        ) : (
          <>
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-red font-hanzi text-2xl font-black text-paper">译</span>
            <div className="relative rounded-2xl border-2 border-paper-3 bg-[#fffdf8] px-5 py-4 text-xl font-semibold">
              <span className="absolute -left-[9px] top-5 size-4 rotate-45 border-b-2 border-l-2 border-paper-3 bg-[#fffdf8]" />
              {ex.sentence.ru}
            </div>
          </>
        )}
      </div>

      <LayoutGroup id={ex.key}>
        <div
          className="flex min-h-[132px] flex-wrap content-start gap-2 border-y-2 border-paper-3 py-3"
          style={{ backgroundImage: 'linear-gradient(transparent 63px, #e0d7c5 63px, #e0d7c5 65px, transparent 65px)', backgroundSize: '100% 66px' }}
        >
          {picked.map((id) => (
            <Tile key={id} id={id} textValue={tiles.find((t) => t.id === id)!.text} />
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {tiles.map((t) =>
            picked.includes(t.id) ? (
              <span
                key={t.id + '-ghost'}
                className={clsx('rounded-[18px] bg-paper-3/70 px-3.5 py-2', zh ? 'min-w-12' : 'text-[17px] font-semibold')}
              >
                <span className="invisible flex flex-col items-center">
                  {zh && showPinyin && <span className="text-[11px] leading-tight">.</span>}
                  <span className={zh ? 'font-hanzi text-2xl leading-tight' : ''}>{t.text}</span>
                </span>
              </span>
            ) : (
              <Tile key={t.id} id={t.id} textValue={t.text} />
            ),
          )}
        </div>
      </LayoutGroup>
    </div>
  )
}
