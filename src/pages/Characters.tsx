import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '../components/AppShell'
import { Button } from '../components/Button'
import { HanziWriterBox, type HanziWriterHandle } from '../components/HanziWriterBox'
import { CloseIcon } from '../components/icons'
import { SpeakButton } from '../components/SpeakButton'
import { allSentences, units } from '../data/curriculum'
import type { Word } from '../data/types'
import { stripTones } from '../lib/pinyin'
import { strength } from '../lib/srs'
import { useApp } from '../lib/store'

export default function Characters() {
  const words = useApp((s) => s.words)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'learned' | 'new'>('all')
  const [open, setOpen] = useState<Word | null>(null)
  const query = stripTones(q.trim().toLowerCase())
  const match = (w: Word) =>
    (!query || w.hanzi.includes(q.trim()) || stripTones(w.pinyin.toLowerCase()).replace(/\s/g, '').includes(query.replace(/\s/g, '')) || w.ru.toLowerCase().includes(query)) &&
    (filter === 'all' || (filter === 'learned' ? !!words[w.id] : !words[w.id]))
  const total = units.reduce((a, u) => a + u.words.length, 0)
  const learned = Object.keys(words).length

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-8 md:pt-10">
      <PageHeader kicker="汉字 · Словарь" title="Иероглифы">
        <div className="font-display text-sm font-semibold text-ink-soft">
          Изучено <span className="text-2xl text-ink">{learned}</span> / {total}
        </div>
      </PageHeader>
      <div className="sticky top-[60px] z-10 -mx-4 mb-8 flex flex-col gap-3 bg-paper/90 px-4 py-3 backdrop-blur md:top-0 md:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск: 你好, nihao, привет…"
          className="flex-1 rounded-2xl border-2 border-paper-3 bg-[#fffdf8] px-5 py-3 text-lg outline-none focus:border-sky"
        />
        <div className="flex gap-2">
          {(['all', 'learned', 'new'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx('rounded-2xl border-2 px-4 py-2 text-sm font-bold', filter === f ? 'border-ink bg-ink text-paper' : 'border-paper-3')}>
              {{ all: 'Все', learned: 'Изученные', new: 'Новые' }[f]}
            </button>
          ))}
        </div>
      </div>
      {units.map((u) => {
        const list = u.words.filter(match)
        if (!list.length) return null
        return (
          <section key={u.id} className="mb-10">
            <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-bold">
              <span className="size-3 rounded-full" style={{ background: u.color }} />
              {u.index + 1}. {u.title}
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {list.map((w) => {
                const st = words[w.id] ? strength(words[w.id]) : 0
                return (
                  <motion.button
                    key={w.id}
                    layout
                    whileHover={{ y: -4 }}
                    onClick={() => setOpen(w)}
                    className={clsx('card3d relative flex flex-col items-center px-2 pb-3 pt-4', !words[w.id] && 'opacity-70')}
                  >
                    <span className="font-hanzi text-3xl font-semibold">{w.hanzi}</span>
                    <span className="mt-1 text-xs text-ink-soft">{w.pinyin}</span>
                    <span className="mt-0.5 line-clamp-1 text-xs font-semibold">{w.ru}</span>
                    {words[w.id] && <span className="absolute inset-x-3 bottom-1.5 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${u.color} ${st * 100}%, #e0d7c5 ${st * 100}%)` }} />}
                  </motion.button>
                )
              })}
            </div>
          </section>
        )
      })}
      <AnimatePresence>{open && <WordDrawer word={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function WordDrawer({ word, onClose }: { word: Word; onClose: () => void }) {
  const chars = Array.from(word.hanzi).filter((c) => /\p{Script=Han}/u.test(c))
  const [ci, setCi] = useState(0)
  const [quiz, setQuiz] = useState(false)
  const ref = useRef<HanziWriterHandle>(null)
  const examples = useMemo(() => allSentences.filter((s) => s.tokens.includes(word.hanzi) || s.tokens.join('').includes(word.hanzi)).slice(0, 4), [word])
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-full w-full max-w-lg overflow-y-auto bg-paper p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-5xl">{word.emoji}</p>
            <h2 className="mt-3 font-hanzi text-6xl font-semibold">{word.hanzi}</h2>
            <p className="mt-2 text-2xl font-medium">{word.pinyin}</p>
            <p className="font-display text-xl font-semibold">{word.ru}</p>
          </div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl hover:bg-paper-2" aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <SpeakButton text={word.hanzi} />
          <SpeakButton text={word.hanzi} slow />
        </div>
        {word.note && <p className="mt-5 rounded-2xl bg-gold/20 p-4 text-sm">💡 {word.note}</p>}
        <h3 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-widest text-ink-soft">Порядок черт</h3>
        {chars.length > 1 && (
          <div className="mb-3 flex gap-2">
            {chars.map((c, i) => (
              <button key={c + i} onClick={() => { setCi(i); setQuiz(false) }} className={clsx('grid size-12 place-items-center rounded-xl border-2 font-hanzi text-2xl', ci === i ? 'border-ink bg-ink text-paper' : 'border-paper-3')}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col items-center rounded-3xl border-2 border-paper-3 bg-[#fffdf8] p-4">
          <HanziWriterBox ref={ref} key={`${chars[ci]}-${quiz}`} char={chars[ci]} size={260} mode={quiz ? 'quiz' : 'animate'} />
          <div className="mt-4 flex gap-2">
            <Button variant="paper" onClick={() => (quiz ? setQuiz(false) : ref.current?.animate())}>Анимация</Button>
            <Button variant="primary" onClick={() => setQuiz(true)}>Написать</Button>
          </div>
        </div>
        {examples.length > 0 && (
          <>
            <h3 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-widest text-ink-soft">Примеры</h3>
            <div className="space-y-2">
              {examples.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border-2 border-paper-3 bg-[#fffdf8] p-3">
                  <SpeakButton text={s.tokens.join('')} size="sm" />
                  <div>
                    <p className="font-hanzi text-xl">{s.tokens.join('')}</p>
                    <p className="text-xs text-ink-soft">{s.ru}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  )
}
