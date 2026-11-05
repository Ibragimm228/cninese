import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { useApp } from '../lib/store'

const GOALS = [
  { xp: 10, label: 'Легко', time: '5 мин в день', hanzi: '慢' },
  { xp: 30, label: 'Нормально', time: '10 мин в день', hanzi: '好' },
  { xp: 50, label: 'Серьёзно', time: '15 мин в день', hanzi: '快' },
  { xp: 80, label: 'Интенсив', time: '20+ мин в день', hanzi: '龙' },
]

export default function Welcome() {
  const navigate = useNavigate()
  const { setName, finishOnboarding } = useApp()
  const [step, setStep] = useState(0)
  const [name, setLocalName] = useState('')
  const [goal, setGoal] = useState(30)

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        <Logo />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={clsx('h-2 rounded-full transition-all duration-500', i <= step ? 'w-8 bg-red' : 'w-2 bg-paper-3')} />
          ))}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div>
                <p className="font-brush text-8xl text-red">你好</p>
                <p className="mt-1 text-ink-soft">nǐ hǎo — привет!</p>
                <h1 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-5xl">Как тебя зовут?</h1>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setLocalName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
                  placeholder="Твоё имя"
                  maxLength={24}
                  className="mt-8 w-full rounded-2xl border-2 border-paper-3 border-b-[5px] bg-[#fffdf8] px-5 py-4 font-display text-xl outline-none focus:border-sky"
                />
                <Button
                  variant="primary"
                  className="mt-6 w-full"
                  onClick={() => {
                    setName(name)
                    setStep(1)
                  }}
                >
                  Далее
                </Button>
              </div>
            )}
            {step === 1 && (
              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Выбери цель дня</h1>
                <p className="mt-3 text-lg text-ink-soft">Её можно поменять в любой момент в профиле.</p>
                <div className="mt-8 grid gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.xp}
                      onClick={() => setGoal(g.xp)}
                      className={clsx('card3d flex items-center gap-4 px-5 py-4 text-left', goal === g.xp && '!border-sky !bg-[#e8f0ff]')}
                    >
                      <span className={clsx('grid size-12 place-items-center rounded-xl font-hanzi text-2xl font-black', goal === g.xp ? 'bg-sky text-white' : 'bg-paper-2')}>
                        {g.hanzi}
                      </span>
                      <span className="flex-1">
                        <span className="block font-display text-lg font-bold">{g.label}</span>
                        <span className="text-ink-soft">{g.time}</span>
                      </span>
                      <span className="font-display font-bold text-ink-soft">{g.xp} XP</span>
                    </button>
                  ))}
                </div>
                <Button variant="primary" className="mt-6 w-full" onClick={() => setStep(2)}>
                  Далее
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="text-center">
                <motion.p initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }} className="font-brush text-[160px] leading-none text-red">
                  开始
                </motion.p>
                <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Всё готово!</h1>
                <p className="mx-auto mt-3 max-w-md text-lg text-ink-soft">
                  Первый урок займёт 3 минуты. Ты выучишь свои первые китайские слова — включи звук 🔊
                </p>
                <Button
                  variant="jade"
                  className="mt-8 w-full"
                  onClick={() => {
                    finishOnboarding(goal)
                    navigate('/lesson/u1-l1')
                  }}
                >
                  Начать первый урок
                </Button>
                <button
                  className="mt-4 font-bold uppercase tracking-wider text-ink-soft hover:text-ink"
                  onClick={() => {
                    finishOnboarding(goal)
                    navigate('/learn')
                  }}
                >
                  Сначала осмотрюсь
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
