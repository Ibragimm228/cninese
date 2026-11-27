import { mnemonics } from '../../data/mnemonics'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Exercise } from '../../lib/exercises'
import { isSingleSyllable } from '../../lib/exercises'
import { speak } from '../../lib/speech'
import { useApp } from '../../lib/store'
import { HanziWriterBox } from '../HanziWriterBox'
import { BulbIcon } from '../icons'
import { SpeakButton } from '../SpeakButton'
import { ExTitle, Pinyin, type ExProps } from './common'

export function IntroEx({ ex, onChange }: ExProps<Extract<Exercise, { type: 'intro' }>>) {
  const w = ex.word
  const rate = useApp((s) => s.settings.speechRate)
  useEffect(() => {
    onChange({ ok: true })
    const t = setTimeout(() => void speak(w.audio ?? w.hanzi, rate), 400)
    return () => clearTimeout(t)
  }, [w, onChange, rate])
  const chars = Array.from(w.hanzi)
  return (
    <div>
      <ExTitle badge="Новое слово">Запомни это слово</ExTitle>
      <motion.div
        initial={{ rotateX: 70, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto flex max-w-md flex-col items-center overflow-hidden rounded-[32px] border-2 border-paper-3 border-b-[6px] bg-card px-6 pb-8 pt-10 text-center"
        style={{ perspective: 800 }}
      >
        <div className="absolute right-5 top-5 flex gap-2">
          <SpeakButton text={w.audio ?? w.hanzi} size="sm" />
          <SpeakButton text={w.audio ?? w.hanzi} size="sm" slow />
        </div>
        {chars.length === 1 && isSingleSyllable(w) ? (
          <HanziWriterBox char={w.hanzi} size={180} mode="animate" />
        ) : (
          <div className={`mt-5 max-w-full break-all font-hanzi font-semibold tracking-wide ${chars.length > 3 ? 'text-4xl md:text-5xl' : 'text-6xl md:text-7xl'}`}>{w.hanzi}</div>
        )}
        <Pinyin text={w.pinyin} className="mt-4 text-2xl" />
        <div className="mt-1 font-display text-xl font-semibold">{w.ru}</div>
        {w.sense && <p className="text-sm text-ink-soft">{w.sense}</p>}
        {w.note && <p className="mt-4 rounded-2xl bg-gold/20 px-4 py-2.5 text-sm text-ink-2"><BulbIcon size={16} className="mr-1 inline-block align-text-bottom" /> {w.note}</p>}
        {[...new Set(w.hanzi)].filter((c) => mnemonics[c]).slice(0, 2).map((c) => (
          <p key={c} className="mt-3 rounded-2xl bg-plum/10 px-4 py-2.5 text-left text-sm text-ink-2">
            <span className="mr-1.5 font-hanzi text-lg text-plum">{c}</span>
            {mnemonics[c].story}
          </p>
        ))}
      </motion.div>
    </div>
  )
}
