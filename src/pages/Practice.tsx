import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/AppShell'
import { RightRail } from '../components/RightRail'
import { dueLabel, dueWords, learnedWords, reviewForecast, weakWords } from '../lib/progress'
import { canRecognize } from '../lib/recognition'
import { hasChineseVoice } from '../lib/speech'
import { strength } from '../lib/srs'
import { useApp } from '../lib/store'

export default function Practice() {
  const s = useApp()
  const navigate = useNavigate()
  const due = dueWords(s)
  const weak = weakWords(s)
  const learned = learnedWords(s)
  const voice = hasChineseVoice()
  const mic = canRecognize()
  const forecast = reviewForecast(s)
  const modes = [
    { id: 'review', title: 'Умное повторение', desc: due.length ? `${due.length} слов` : 'Всё повторено', hanzi: '复', color: '#22a06b', shadow: '#17784f', big: true },
    { id: 'mistakes', title: 'Работа над ошибками', desc: weak.length ? `${weak.length} слов` : 'Ошибок нет', hanzi: '错', color: '#e5484d', shadow: '#b3282d', disabled: !weak.length },
    { id: 'listening', title: 'Аудирование', desc: voice ? 'На слух' : 'Нет китайского голоса', hanzi: '听', color: '#3d7bf7', shadow: '#2557c2', disabled: !voice },
    { id: 'speaking', title: 'Говорение', desc: mic ? 'Вслух в микрофон' : 'Нужен Chrome', hanzi: '说', color: '#f08a00', shadow: '#b86400', disabled: !mic },
    { id: 'writing', title: 'Каллиграфия', desc: 'По чертам', hanzi: '写', color: '#e63b2e', shadow: '#b82a20' },
    { id: 'sentences', title: 'Фразы', desc: 'Собери предложение', hanzi: '句', color: '#8b5cf6', shadow: '#6a3fd1' },
  ]
  return (
    <div className="mx-auto flex max-w-[1100px] gap-10 px-4 pt-6 md:px-8 md:pt-10">
      <div className="min-w-0 flex-1">
        <PageHeader title="Практика" />
        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              disabled={m.disabled}
              onClick={() => navigate(`/practice/${m.id}`)}
              className={`mode-card group relative overflow-hidden rounded-[28px] p-6 text-left text-white transition-transform active:translate-y-1 disabled:opacity-45 ${m.big ? 'sm:col-span-2 sm:p-8' : ''}`}
              style={{ '--m': m.color, '--m-shadow': m.shadow } as React.CSSProperties}
            >
              <span className="mode-hanzi absolute -bottom-6 -right-2 font-brush text-[130px] leading-none text-white/20">
                {m.hanzi}
              </span>
              <h3 className={`relative font-display font-bold ${m.big ? 'text-3xl' : 'text-xl'}`}>{m.title}</h3>
              <p className="mode-desc relative mt-1 text-white/85">{m.desc}</p>
            </motion.button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3" aria-label="Расписание повторений">
          {[['Сейчас', forecast.now], ['Завтра', forecast.tomorrow], ['За неделю', forecast.week]].map(([label, n]) => (
            <div key={label} className="row-card rounded-2xl border-2 border-paper-3 bg-card px-4 py-3">
              <p className="font-display text-2xl font-bold">{n}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-4 mt-12 font-display text-2xl font-bold">Сила слов</h2>
        {learned.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-paper-3 p-8 text-center text-ink-soft">Пока пусто</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {learned.map((w) => {
              const st = strength(s.words[w.id])
              return (
                <div key={w.id} className="row-card flex items-center gap-3 rounded-2xl border-2 border-paper-3 bg-card px-4 py-3">
                  <span className="w-14 font-hanzi text-2xl font-semibold">{w.hanzi}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {w.pinyin} · <span className="text-ink-soft">{w.ru}</span>
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Повтор {dueLabel(s.words[w.id]?.due ?? 0)}</p>
                    <div className="mt-1.5 flex gap-1">
                      {[0, 1, 2, 3].map((k) => (
                        <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: st > k / 4 ? (st > 0.6 ? '#22a06b' : st > 0.35 ? '#f2b33d' : '#e5484d') : 'var(--color-paper-3)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <RightRail />
    </div>
  )
}
