import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '../../lib/exercises'
import { TONE_INFO, toneOf } from '../../lib/pinyin'
import { speak } from '../../lib/speech'
import { useApp } from '../../lib/store'
import { sfx } from '../../lib/sounds'
import { SpeakButton } from '../SpeakButton'
import { ExTitle, HanziLine, OptionCard, Pinyin, useNumberKeys, type ExProps } from './common'

function useSelect<T>(options: T[], locked: boolean, onSelect: (o: T) => void) {
  const [sel, setSel] = useState<number | null>(null)
  const pick = useCallback(
    (i: number) => {
      if (locked) return
      sfx.tap()
      setSel(i)
      onSelect(options[i])
    },
    [locked, options, onSelect],
  )
  useNumberKeys(options.length, pick, !locked)
  return [sel, pick] as const
}

export function ChoiceEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'choice' }>>) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const rate = useApp((s) => s.settings.speechRate)
  const w = ex.word
  const [sel, pick] = useSelect(ex.options, locked, (o) =>
    onChange({ ok: o.id === w.id, solution: ex.direction === 'zh-ru' ? w.ru : `${w.hanzi} (${w.pinyin})` }),
  )
  useEffect(() => {
    if (ex.direction === 'zh-ru') void speak(w.hanzi, rate)
  }, [ex, w, rate])

  if (ex.direction === 'zh-ru')
    return (
      <div>
        <ExTitle>Что означает это слово?</ExTitle>
        <div className="mb-8 flex items-center gap-5">
          <SpeakButton text={w.hanzi} size="lg" />
          <div>
            {showPinyin && <Pinyin text={w.pinyin} className="block text-lg" />}
            <span className="font-hanzi text-5xl font-semibold md:text-6xl">{w.hanzi}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ex.options.map((o, i) => (
            <OptionCard
              key={o.id}
              index={i}
              selected={sel === i}
              disabled={locked}
              onClick={() => pick(i)}
              state={locked ? (o.id === w.id ? 'correct' : sel === i ? 'wrong' : null) : null}
            >
              <span className="text-2xl">{o.emoji}</span>
              <span className="text-lg font-semibold">{o.ru}</span>
            </OptionCard>
          ))}
        </div>
      </div>
    )

  return (
    <div>
      <ExTitle>
        Как сказать <span className="text-red">«{w.ru}»</span>?
      </ExTitle>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {ex.options.map((o, i) => (
          <OptionCard
            key={o.id}
            selected={sel === i}
            disabled={locked}
            onClick={() => {
              pick(i)
              void speak(o.hanzi, rate)
            }}
            state={locked ? (o.id === w.id ? 'correct' : sel === i ? 'wrong' : null) : null}
            className="flex-col !items-center justify-center gap-1 py-6 text-center md:py-8"
          >
            <span className="text-4xl md:text-5xl">{o.emoji}</span>
            <span className="mt-2 font-hanzi text-3xl font-semibold md:text-4xl">{o.hanzi}</span>
            {showPinyin && <span className="text-sm text-ink-soft">{o.pinyin}</span>}
          </OptionCard>
        ))}
      </div>
    </div>
  )
}

export function ListenEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'listen' }>>) {
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const rate = useApp((s) => s.settings.speechRate)
  const w = ex.word
  const [sel, pick] = useSelect(ex.options, locked, (o) =>
    onChange({ ok: o.id === w.id, solution: `${w.hanzi} (${w.pinyin}) — ${w.ru}` }),
  )
  useEffect(() => {
    const t = setTimeout(() => void speak(w.hanzi, rate), 300)
    return () => clearTimeout(t)
  }, [w, rate])
  return (
    <div>
      <ExTitle badge="Аудирование">Что ты слышишь?</ExTitle>
      <div className="mb-10 flex items-end justify-center gap-4">
        <SpeakButton text={w.hanzi} size="xl" autoFocus />
        <SpeakButton text={w.hanzi} size="lg" slow />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ex.options.map((o, i) => (
          <OptionCard
            key={o.id}
            index={i}
            selected={sel === i}
            disabled={locked}
            onClick={() => pick(i)}
            state={locked ? (o.id === w.id ? 'correct' : sel === i ? 'wrong' : null) : null}
            className="flex-col !items-center justify-center py-5 text-center"
          >
            <span className="font-hanzi text-3xl font-semibold">{o.hanzi}</span>
            {(showPinyin || locked) && <span className="text-sm text-ink-soft">{o.pinyin}</span>}
          </OptionCard>
        ))}
      </div>
    </div>
  )
}

export function ToneEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'tone' }>>) {
  const w = ex.word
  const [sel, pick] = useSelect(ex.options, locked, (o) => onChange({ ok: o === w.pinyin, solution: w.pinyin }))
  const addStat = useApp((s) => s.addStat)
  useEffect(() => {
    if (locked && sel !== null && ex.options[sel] === w.pinyin) addStat('tonesCorrect')
  }, [locked, sel, ex.options, w.pinyin, addStat])
  return (
    <div>
      <ExTitle badge="Тоны">Выбери правильный тон</ExTitle>
      <div className="mb-8 flex items-center gap-5">
        <SpeakButton text={w.hanzi} size="lg" />
        <div>
          <span className="font-hanzi text-6xl font-semibold">{w.hanzi}</span>
          <span className="ml-3 text-lg text-ink-soft">— {w.ru}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ex.options.map((o, i) => {
          const t = toneOf(o)
          const info = TONE_INFO[t - 1]
          return (
            <OptionCard
              key={o}
              index={i}
              selected={sel === i}
              disabled={locked}
              onClick={() => pick(i)}
              state={locked ? (o === w.pinyin ? 'correct' : sel === i ? 'wrong' : null) : null}
              className="flex-col !items-center gap-2 py-5"
            >
              <svg viewBox="0 0 100 90" className="h-10 w-14">
                <path d={info?.path ?? 'M10 50 L90 50'} stroke={info?.color ?? '#6b665e'} strokeWidth="9" strokeLinecap="round" fill="none" />
              </svg>
              <span className="font-sans text-2xl font-semibold">{o}</span>
              <span className={clsx('text-xs text-ink-soft')}>{info ? `${t}-й тон` : 'нейтральный'}</span>
            </OptionCard>
          )
        })}
      </div>
    </div>
  )
}

export function FillEx({ ex, locked, onChange }: ExProps<Extract<Exercise, { type: 'fill' }>>) {
  const answer = ex.sentence.tokens[ex.blank]
  const showPinyin = useApp((s) => s.settings.showPinyin)
  const [sel, pick] = useSelect(ex.options, locked, (o) =>
    onChange({ ok: o.hanzi === answer, solution: ex.sentence.tokens.join('') }),
  )
  return (
    <div>
      <ExTitle>Заполни пропуск</ExTitle>
      <div className="mb-3 rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-6">
        <HanziLine tokens={ex.sentence.tokens} blank={ex.blank} blankContent={sel !== null ? ex.options[sel].hanzi : undefined} />
        <p className="mt-4 text-ink-soft">{ex.sentence.ru}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ex.options.map((o, i) => (
          <OptionCard
            key={o.id}
            index={i}
            selected={sel === i}
            disabled={locked}
            onClick={() => pick(i)}
            state={locked ? (o.hanzi === answer ? 'correct' : sel === i ? 'wrong' : null) : null}
            className="flex-col !items-center py-4"
          >
            <span className="font-hanzi text-2xl font-semibold">{o.hanzi}</span>
            {showPinyin && <span className="text-xs text-ink-soft">{o.pinyin}</span>}
          </OptionCard>
        ))}
      </div>
    </div>
  )
}
