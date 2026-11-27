import clsx from 'clsx'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Companion3D } from '../components/Companion3D'
import { HanziWriterBox } from '../components/HanziWriterBox'
import { CheckIcon, HeartIcon, SpeakerIcon } from '../components/icons'
import { Logo } from '../components/Logo'
import { allSentences, allWords, units } from '../data/curriculum'
import { TONE_INFO } from '../lib/pinyin'
import { speak } from '../lib/speech'
import { useApp } from '../lib/store'
import { PitchTrainer } from '../components/PitchTrainer'
import { mnemonics } from '../data/mnemonics'
import { useLenis } from '../lib/useLenis'

const EASE = [0.16, 1, 0.3, 1] as const

export default function Landing() {
  useLenis()
  return (
    <div className="relative bg-paper text-ink">
      <TopNav />
      <Hero />
      <MarqueeBand />
      <Manifesto />
      <WhyUs />
      <Features />
      <PitchSection />
      <TonesDemo />
      <MnemonicDemo />
      <StrokeDemo />
      <Numbers />
      <FinalCta />
      <Footer />
    </div>
  )
}


function TopNav() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => scrollY.on('change', (v) => setScrolled(v > 40)), [scrollY])
  const onboarded = useApp((s) => s.onboarded)
  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-40 transition-[padding,background-color] duration-150 ease-out',
        scrolled ? 'bg-paper/80 py-3 backdrop-blur-md' : 'py-5 md:py-7',
      )}
    >
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 md:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 font-display text-[13px] font-medium uppercase tracking-wider md:flex">
          {[
            ['#why', 'Почему мы'],
            ['#method', 'Метод'],
            ['#tones', 'Тоны'],
            ['#strokes', 'Иероглифы'],
            
          ].map(([href, label]) => (
            <a key={href} href={href} className="transition-colors duration-150 ease-out hover:text-red">{label}</a>
          ))}
        </nav>
        <Link
          to={onboarded ? '/learn' : '/welcome'}
          className="rounded-full bg-ink px-5 py-2.5 font-display text-[13px] font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-red"
        >
          {onboarded ? 'Продолжить' : 'Начать'}
        </Link>
      </div>
    </header>
  )
}


function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { damping: 15, stiffness: 150 })
  const sy = useSpring(y, { damping: 15, stiffness: 150 })
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduceMotion) return
        const r = ref.current!.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.3)
        y.set((e.clientY - r.top - r.height / 2) * 0.3)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

const FLASHCARDS = [
  { h: '你好', p: 'nǐ hǎo', r: 'привет' },
  { h: '茶', p: 'chá', r: 'чай' },
  { h: '爱', p: 'ài', r: 'любить' },
]

function Hero() {
  const onboarded = useApp((s) => s.onboarded)
  return (
    <section className="landing-hero">
      <div className="landing-layout">
        <div className="landing-copy">
          <h1>Китайский.<br />С нуля<span>.</span></h1>
          <p className="landing-description">Короткие уроки, живые тоны и первые иероглифы. Собирай серию вместе с аниме-спутником.</p>
          <div className="landing-actions">
            <Link to={onboarded ? '/learn' : '/welcome'} className="editorial-cta">
              {onboarded ? 'Продолжить обучение' : 'Начать бесплатно'}
            </Link>
            <a href="#method">Как это работает</a>
          </div>
        </div>
        <div className="landing-visual">
          <div className="landing-poster">
            <span className="landing-poster-orbit" aria-hidden="true" />
            <span className="landing-poster-glyph" aria-hidden="true">伴</span>
            <Companion3D ids={['kuroko', 'chrollo', 'ichigo']} className="poster-stage" accent="#ffd9a0" />
          </div>
          <div className="landing-words" aria-label="Послушай первые слова">
            {FLASHCARDS.map((word) => (
              <button key={word.h} type="button" onClick={() => void speak(word.h)} aria-label={`Послушать: ${word.h}, ${word.r}`}>
                <span className="font-hanzi">{word.h}</span><span><strong>{word.p}</strong><small>{word.r}</small></span><SpeakerIcon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MarqueeBand() {
  const items = allWords.filter((_, i) => i % 3 === 0).slice(0, 18)
  const row = (reverse?: boolean) => (
    <div className={clsx('marquee gap-10 py-5', reverse && 'reverse')} style={{ ['--marquee-speed' as string]: '60s' }}>
      {[...items, ...items].map((w, i) => (
        <span key={i} className="flex shrink-0 items-baseline gap-3">
          <span className="font-hanzi text-4xl font-semibold md:text-5xl">{w.hanzi}</span>
          <span className="font-serif text-2xl italic text-paper/60 md:text-3xl">{w.pinyin}</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="overflow-x-clip">
      <section className="relative z-10 -rotate-2 scale-105 overflow-hidden bg-ink text-paper">
        {row()}
      </section>
    </div>
  )
}

const MANIFESTO =
  'Duolingo учит китайскому как испанскому. Здесь тон видно глазами, иероглиф раскрывается историей, а каждый уровень завершается пробным HSK.'

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = MANIFESTO.split(' ')
  return (
    <section id="method" className="relative px-5 py-32 md:px-10 md:py-48">
      <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1fr_3fr]">
        <div>
          <p className="font-brush text-8xl text-ink">道</p>
          <p className="mt-2 font-serif text-lg italic text-ink-soft">dào, путь</p>
        </div>
        <div ref={ref} className="font-display text-[8vw] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[4.2vw]">
          {words.map((w, i) => (
            <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
              {w}
            </Word>
          ))}
        </div>
      </div>
    </section>
  )
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1])
  const highlight = ['видно', 'историей,', 'HSK']
  return (
    <motion.span style={{ opacity }} className={clsx('mr-[0.25em] inline-block', highlight.includes(children) && 'font-serif italic font-medium text-red')}>
      {children}
    </motion.span>
  )
}

const FEATURES = [
  {
    title: 'Уроки-игры',
    hanzi: '玩',
    text: '8 типов заданий: выбор перевода, аудирование, сборка фраз, пары, тоны, письмо.',
    bg: '#22a06b',
    demo: 'lesson',
  },
  {
    title: 'Тоны на слух',
    hanzi: '声',
    text: 'Контур каждого тона на экране и озвучка помогают услышать разницу между mā и mà.',
    bg: '#3d7bf7',
    demo: 'tones',
  },
  {
    title: 'Пиши кистью',
    hanzi: '写',
    text: 'Рисуй иероглифы пальцем прямо на экране. Мы проверим порядок черт и подскажем, если ошибёшься.',
    bg: '#e63b2e',
    demo: 'write',
  },
  {
    title: 'Умные повторения',
    hanzi: '记',
    text: 'Интервальное повторение напомнит слово тогда, когда ты начнёшь его забывать.',
    bg: '#f2b33d',
    demo: 'srs',
  },
]

function Features() {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%'])
  return (
    <section ref={ref} className={clsx('relative bg-ink text-paper', !reduceMotion && 'h-[400vh]')}>
      <div className={clsx('flex flex-col overflow-hidden', !reduceMotion && 'sticky top-0 h-[100svh]')}>
        <div className="mx-auto flex w-full max-w-[1500px] items-end justify-between px-5 pt-24 md:px-10 md:pt-28">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-7xl">
            Четыре <span className="font-serif font-medium italic text-red">части</span> курса
          </h2>
          {!reduceMotion && (
            <div className="hidden h-[2px] w-60 bg-paper/15 md:block">
              <motion.div className="h-full origin-left bg-red" style={{ scaleX: scrollYProgress }} />
            </div>
          )}
        </div>
        <motion.div style={reduceMotion ? undefined : { x }} className={clsx('flex items-center', reduceMotion ? 'flex-col gap-4 py-6' : 'h-full w-[400%]')}>
          {FEATURES.map((f) => (
            <div key={f.title} className={clsx('flex items-center px-5 md:px-10', reduceMotion ? 'w-full max-w-[1500px]' : 'h-full w-1/4')}>
              <div className="relative grid h-[68svh] w-full grid-rows-[auto_1fr] overflow-hidden rounded-[36px] p-7 text-ink md:grid-cols-2 md:grid-rows-1 md:p-12" style={{ background: f.bg }}>
                <span className="pointer-events-none absolute -bottom-16 -left-6 select-none font-brush text-[50vw] leading-none text-black/10 md:text-[28vw]">
                  {f.hanzi}
                </span>
                <div className="relative flex flex-col">
                  <h3 className="mt-auto font-display text-4xl font-bold leading-none tracking-tight md:text-7xl">{f.title}</h3>
                  <p className="mt-5 max-w-md text-base leading-relaxed md:text-xl">{f.text}</p>
                </div>
                <div className="relative hidden items-center justify-center md:flex">
                  <FeatureDemo kind={f.demo} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureDemo({ kind }: { kind: string }) {
  if (kind === 'lesson')
    return (
      <div className="w-[360px] rotate-2 rounded-[28px] bg-paper p-5 shadow-[12px_12px_0_rgba(0,0,0,.25)]">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 rounded-full bg-paper-3">
            <div className="h-full w-2/3 rounded-full bg-jade" />
          </div>
          <HeartIcon size={20} className="text-wrong" /> <span className="font-bold text-wrong">4</span>
        </div>
        <p className="mt-5 font-display text-lg font-bold">Как сказать «чай»?</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            ['茶', true],
            ['水', false],
            ['咖啡', false],
            ['苹果', false],
          ].map(([h, ok]) => (
            <div key={h as string} className={clsx('card3d flex flex-col items-center py-3', ok && '!border-jade !bg-jade-soft')}>
              <span className="font-hanzi text-xl font-semibold">{h}</span>
            </div>
          ))}
        </div>
        <div className="btn3d mt-4 bg-jade py-3 text-center text-sm text-white" style={{ ['--btn-shadow' as string]: '#17784f' }}>
          Отлично!
        </div>
      </div>
    )
  if (kind === 'tones')
    return (
      <div className="grid w-[380px] -rotate-2 grid-cols-2 gap-3">
        {TONE_INFO.map((t, i) => (
          <div key={t.n} className="rounded-3xl bg-paper p-4 shadow-[8px_8px_0_rgba(0,0,0,.2)]">
            <svg viewBox="0 0 100 90" className="h-14 w-full">
              <path d={t.path} stroke={t.color} strokeWidth="10" strokeLinecap="round" fill="none" />
            </svg>
            <p className="mt-2 text-center font-sans text-3xl font-semibold">{['mā', 'má', 'mǎ', 'mà'][i]}</p>
            <p className="text-center text-xs text-ink-soft">{['мама', 'конопля', 'лошадь', 'ругать'][i]}</p>
          </div>
        ))}
      </div>
    )
  if (kind === 'write')
    return (
      <div className="rotate-3 rounded-[28px] bg-paper p-4 shadow-[12px_12px_0_rgba(0,0,0,.25)]">
        <HanziWriterBox char="永" size={280} mode="animate" loop />
      </div>
    )
  return (
    <div className="w-[360px] -rotate-2 space-y-3">
      {[
        ['猫', 'māo', 'кошка', 'через 3 дня', 0.9],
        ['喜欢', 'xǐhuan', 'нравиться', 'завтра', 0.6],
        ['漂亮', 'piàoliang', 'красивый', 'сейчас', 0.25],
      ].map(([h, p, r, when, s]) => (
        <div key={h as string} className="flex items-center gap-4 rounded-2xl bg-paper p-4 shadow-[8px_8px_0_rgba(0,0,0,.2)]">
          <span className="font-hanzi text-3xl font-semibold">{h}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {p} · {r}
            </p>
            <div className="mt-1.5 h-2 rounded-full bg-paper-3">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(s as number) * 100}%` }} />
            </div>
          </div>
          <span className="text-xs font-semibold text-ink-soft">{when}</span>
        </div>
      ))}
    </div>
  )
}

const TONE_WORDS = [
  { s: 'mā', h: '妈', r: 'мама' },
  { s: 'má', h: '麻', r: 'конопля' },
  { s: 'mǎ', h: '马', r: 'лошадь' },
  { s: 'mà', h: '骂', r: 'ругать' },
]

function TonesDemo() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <section id="tones" className="relative px-5 py-32 md:px-10 md:py-44">
      <div className="mx-auto max-w-[1500px]">
        <h2 className="mb-16 max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-8xl">
          Один слог, <span className="font-serif font-medium italic text-red">четыре</span> смысла
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {TONE_INFO.map((t, i) => (
            <button
              key={t.n}
              onClick={() => {
                setActive(i)
                void speak(TONE_WORDS[i].h, 0.7)
              }}
              className={clsx(
                'group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[28px] border-2 p-5 text-left transition-colors duration-150 ease-out md:p-7',
                active === i ? 'border-transparent text-white' : 'border-ink bg-paper',
              )}
              style={active === i ? { background: t.color } : undefined}
            >
              <div className="flex items-start justify-between">
                <span className="font-display text-sm font-semibold">{t.n}-й тон</span>
                <SpeakerIcon size={22} className="opacity-60 transition-opacity group-hover:opacity-100" />
              </div>
              <svg viewBox="0 0 100 90" className="mx-auto h-20 w-full md:h-28">
                <path d="M5 14 H95 M5 76 H95" stroke="currentColor" strokeOpacity=".12" strokeWidth="1.5" strokeDasharray="4 4" />
                <motion.path
                  key={active === i ? 'on' : 'off'}
                  d={t.path}
                  stroke={active === i ? '#fff' : t.color}
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </svg>
              <div>
                <p className="font-sans text-6xl font-semibold tracking-tight md:text-7xl">{TONE_WORDS[i].s}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-hanzi text-3xl font-semibold">{TONE_WORDS[i].h}</span>
                  <span className={clsx('font-serif text-xl italic', active === i ? 'text-white/85' : 'text-ink-soft')}>{TONE_WORDS[i].r}</span>
                </div>
                <p className={clsx('mt-3 hidden text-sm md:block', active === i ? 'text-white/85' : 'text-ink-soft')}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

const STROKE_CHARS = [
  { c: '永', p: 'yǒng', r: 'вечность, в нём все 8 базовых черт' },
  { c: '爱', p: 'ài', r: 'любовь' },
  { c: '学', p: 'xué', r: 'учиться' },
  { c: '中', p: 'zhōng', r: 'середина, Китай' },
  { c: '龙', p: 'lóng', r: 'дракон' },
]

function StrokeDemo() {
  const [i, setI] = useState(0)
  const [quiz, setQuiz] = useState(false)
  const [done, setDone] = useState(false)
  const ch = STROKE_CHARS[i]
  return (
    <section id="strokes" className="relative overflow-hidden bg-paper-2 px-5 py-32 md:px-10 md:py-44">
      <span className="pointer-events-none absolute -right-20 top-10 select-none font-brush text-[40vw] leading-none text-ink/[0.04]">书法</span>
      <div className="relative mx-auto grid max-w-[1500px] items-center gap-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-7xl">
            Каждая черта <br />
            <span className="font-serif font-medium italic text-red">имеет значение</span>
          </h2>
          <p className="mt-8 max-w-md text-lg text-ink-2">
            Посмотри, как пишется иероглиф, и напиши его сам мышью или пальцем.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {STROKE_CHARS.map((s, j) => (
              <button
                key={s.c}
                onClick={() => {
                  setI(j)
                  setQuiz(false)
                  setDone(false)
                }}
                className={clsx(
                  'grid size-16 place-items-center rounded-2xl border-2 font-hanzi text-3xl font-semibold transition-colors duration-150 ease-out',
                  i === j ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink',
                )}
              >
                {s.c}
              </button>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setQuiz(false)
                setDone(false)
              }}
              className={clsx('rounded-full px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider', !quiz ? 'bg-red text-paper' : 'border-2 border-ink')}
            >
              Смотреть
            </button>
            <button
              onClick={() => {
                setQuiz(true)
                setDone(false)
              }}
              className={clsx('rounded-full px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider', quiz ? 'bg-red text-paper' : 'border-2 border-ink')}
            >
              Написать самому
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative rounded-[36px] bg-card p-5 shadow-[16px_16px_0_#121110]">
            <HanziWriterBox key={`${ch.c}-${quiz}`} char={ch.c} size={Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 80 : 380)} mode={quiz ? 'quiz' : 'animate'} loop={!quiz} onQuizComplete={() => setDone(true)} />
            <AnimatePresence>
              {done && (
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -12 }} className="absolute -right-6 -top-6 grid size-24 place-items-center rounded-full bg-red font-brush text-5xl text-paper shadow-lg">
                  好
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-8 font-sans text-2xl font-semibold">{ch.p}</p>
          <p className="font-serif text-xl italic text-ink-soft">{ch.r}</p>
        </div>
      </div>
    </section>
  )
}

function Numbers() {
  const stats = [
    { n: allWords.length, label: 'слов и выражений курса' },
    { n: units.length, label: 'тематических юнитов' },
    { n: allSentences.length, label: 'фраз для практики' },
    { n: 8, label: 'типов заданий' },
  ]
  return (
    <section id="numbers" className="px-5 py-32 md:px-10 md:py-44">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid border-t-2 border-ink md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={clsx('border-b-2 border-ink py-10 md:border-b-0 md:px-8 md:py-14', i > 0 && 'md:border-l-2')}
            >
              <p className="font-display text-7xl font-bold tracking-[-0.04em] md:text-8xl">
                {s.n}
              </p>
              <p className="mt-4 max-w-[12rem] text-lg text-ink-2">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {units.slice(0, 6).map((u) => (
            <div
              key={u.id}
              className="relative overflow-hidden rounded-[28px] p-7 text-white"
              style={{ background: u.color }}
            >
              <span className="absolute -right-4 -top-8 font-brush text-[140px] leading-none text-white/15">{u.hanzi}</span>
              <p className="relative font-display text-xs uppercase tracking-[0.25em] text-white/80">Юнит {u.index + 1}</p>
              <p className="relative mt-12 font-display text-3xl font-bold">{u.title}</p>
              <p className="relative mt-1 text-white/85">{u.subtitle}</p>
              <p className="relative mt-6 flex flex-wrap gap-2">
                {u.words.slice(0, 5).map((w) => (
                  <span key={w.id} className="rounded-full bg-card/20 px-3 py-1 font-hanzi text-sm">
                    {w.hanzi}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const onboarded = useApp((s) => s.onboarded)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const scale = useTransform(scrollYProgress, [0, 1], [0.7, 1])
  const radius = useTransform(scrollYProgress, [0, 1], [120, 0])
  return (
    <section ref={ref} className="px-0">
      <motion.div style={reduceMotion ? undefined : { scale, borderRadius: radius }} className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-red px-5 text-center text-paper">
        <div className="marquee absolute top-10 gap-8 opacity-25" style={{ ['--marquee-speed' as string]: '30s' }}>
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['加油', '学习', '中文', '每天', '进步'].map((w) => (
              <span key={`${k}-${w}`} className="font-brush text-7xl">
                {w}
              </span>
            )),
          )}
        </div>
        <h2 className="font-display text-[16vw] font-bold leading-[0.85] tracking-[-0.05em] md:text-[11vw]">
          Начни
          <br />
          <span className="font-serif font-medium italic">сегодня</span>
        </h2>
        <Magnetic className="mt-12">
          <button
            onClick={() => navigate(onboarded ? '/learn' : '/welcome')}
            className="grid size-44 place-items-center rounded-full bg-paper font-display text-sm font-bold uppercase tracking-wider text-ink md:size-56 md:text-base"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="font-hanzi text-5xl font-semibold text-red">开始</span>
              Поехали
            </span>
          </button>
        </Magnetic>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-ink px-5 pb-10 pt-24 text-paper md:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div>
            <p className="font-display text-5xl font-bold md:text-7xl">
              Mòlì<span className="text-red">.</span>
            </p>
            <p className="mt-3 max-w-sm font-serif text-xl italic text-paper/60">茉莉 значит «жасмин».</p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-3 font-display text-sm uppercase tracking-wider">
            <Link to="/learn" className="hover:text-red">Учить</Link>
            <Link to="/tones" className="hover:text-red">Тоны</Link>
            <Link to="/characters" className="hover:text-red">Иероглифы</Link>
            <Link to="/practice" className="hover:text-red">Практика</Link>
            <Link to="/league" className="hover:text-red">Лига</Link>
            <Link to="/profile" className="hover:text-red">Профиль</Link>
          </div>
        </div>
        <div className="mt-24 flex flex-col justify-between gap-4 border-t border-paper/15 pt-6 text-sm text-paper/50 md:flex-row">
          <span>© {new Date().getFullYear()} Mòlì</span>
          <span>Прогресс хранится в твоём браузере</span>
        </div>
      </div>
    </footer>
  )
}


const COMPARE: { f: string; d: string; m: string }[] = [
  { f: 'Проверка тона голосом', d: 'нет', m: 'график твоего голоса поверх эталона' },
  { f: 'Иероглифы', d: 'узнать по картинке', m: 'разбор на ключи + история для запоминания' },
  { f: 'Письмо', d: 'тап по готовым чертам', m: 'пишешь сам, с проверкой порядка черт' },
  { f: 'Объяснения', d: 'переведены с английского', m: 'написаны для русскоязычных' },
  { f: 'Цель', d: 'абстрактные «уровни»', m: 'пробные HSK 1–3 и охват лексики' },
  { f: 'Сердца', d: 'за деньги', m: 'бесплатно, за кристаллы', },
  { f: 'Реклама', d: 'есть', m: 'нет и не будет' },
]

function WhyUs() {
  return (
    <section id="why" className="relative px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1500px]">
        <h2 className="font-display text-[12vw] font-bold leading-[0.9] tracking-[-0.05em] md:text-[7vw]">
          Не ещё один <span className="font-serif font-medium italic text-red">Duolingo</span>
        </h2>
        <div className="mt-16 overflow-hidden rounded-[32px] border-2 border-ink">
          <div className="grid grid-cols-[1.1fr_1fr_1.3fr] bg-ink px-5 py-4 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-paper md:px-8 md:text-xs">
            <span />
            <span className="text-paper/50">Duolingo</span>
            <span className="text-gold">Mòlì 茉莉</span>
          </div>
          {COMPARE.map((r) => (
            <div
              key={r.f}
              className="group grid grid-cols-[1.1fr_1fr_1.3fr] items-center gap-3 border-t-2 border-ink/10 px-5 py-5 transition-colors hover:bg-red hover:text-white md:px-8 md:py-6"
            >
              <span className="font-display text-sm font-bold md:text-xl">{r.f}</span>
              <span className="text-sm text-ink-soft line-through decoration-red/60 group-hover:text-white/60 md:text-base">{r.d}</span>
              <span className="flex items-center gap-3 text-sm font-semibold md:text-lg">
<CheckIcon size={24} className="shrink-0 text-jade group-hover:text-white" />
                {r.m}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PitchSection() {
  return (
    <section className="relative bg-ink px-5 py-28 text-paper md:px-10 md:py-40">
      <div className="mx-auto grid max-w-[1500px] gap-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
            Увидь свой <span className="font-serif font-medium italic text-red">голос</span>
          </h2>
          <p className="max-w-lg text-lg text-paper/60">
            Скажи слог в микрофон, и Mòlì нарисует мелодию твоего голоса поверх эталонной, оценит её и подскажет, какой тон получился на самом деле. Запись не покидает браузер.
          </p>
        </div>
        <PitchTrainer header={false} />
      </div>
    </section>
  )
}

const MNEMO_CHARS = ['好', '家', '看', '明', '休']

function MnemonicDemo() {
  const list = MNEMO_CHARS.filter((c) => mnemonics[c])
  const [i, setI] = useState(0)
  const c = list[i]
  const m = mnemonics[c]
  return (
    <section id="mnemo" className="relative overflow-hidden px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative grid aspect-square max-w-[560px] place-items-center rounded-[40px] bg-paper-2">
            <AnimatePresence mode="wait">
              <motion.div key={c} className="flex items-center gap-3 px-4 md:gap-6" initial="h" animate="v" exit="h">
                {m.parts.map((p, k) => (
                  <motion.div
                    key={k}
                    variants={{ h: { opacity: 0, y: 40, rotate: -10 }, v: { opacity: 1, y: 0, rotate: 0 } }}
                    transition={{ duration: 0.6, delay: k * 0.15, ease: EASE }}
                    className="flex flex-col items-center"
                  >
                    <span className="font-hanzi text-5xl font-semibold md:text-7xl xl:text-8xl">{p.c}</span>
                    <span className="mt-2 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper md:text-sm">{p.m}</span>
                  </motion.div>
                ))}
                <motion.span variants={{ h: { opacity: 0 }, v: { opacity: 1 } }} transition={{ delay: 0.4 }} className="font-display text-4xl text-ink-soft">=</motion.span>
                <motion.span
                  variants={{ h: { opacity: 0, scale: 0.5 }, v: { opacity: 1, scale: 1 } }}
                  transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
                  className="font-brush text-[90px] leading-none text-red md:text-[150px]"
                >
                  {c}
                </motion.span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div>
            <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Иероглиф как <span className="font-serif font-medium italic text-red">история</span>
            </h2>
            <AnimatePresence mode="wait">
              <motion.p key={c} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5 }} className="mt-8 max-w-lg font-serif text-3xl italic leading-snug">
                «{m.story}»
              </motion.p>
            </AnimatePresence>
            <p className="mt-6 max-w-md text-ink-soft">{Object.keys(mnemonics).length} иероглифов разобраны на ключи с короткими историями.</p>
            <div className="mt-8 flex gap-2">
              {list.map((x, k) => (
                <button key={x} onClick={() => setI(k)} className={clsx('grid size-14 place-items-center rounded-2xl border-2 font-hanzi text-2xl transition-colors duration-150 ease-out', k === i ? 'border-red bg-red text-white' : 'border-ink/15 hover:border-ink')}>
                  {x}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
