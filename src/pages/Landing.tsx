import clsx from 'clsx'
import { AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cursor } from '../components/Cursor'
import { HanziWriterBox } from '../components/HanziWriterBox'
import { ArrowRight, ArrowUpRight, CheckIcon, FlameIcon, HeartIcon, SparkIcon, SpeakerIcon } from '../components/icons'
import { Logo } from '../components/Logo'
import { allSentences, allWords, units } from '../data/curriculum'
import { TONE_INFO } from '../lib/pinyin'
import { speak } from '../lib/speech'
import { useApp } from '../lib/store'
import { useLenis } from '../lib/useLenis'

const EASE = [0.16, 1, 0.3, 1] as const

export default function Landing() {
  useLenis()
  const [loading, setLoading] = useState(() => !sessionStorage.getItem('moli-intro'))
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => {
      sessionStorage.setItem('moli-intro', '1')
      setLoading(false)
    }, 1900)
    return () => clearTimeout(t)
  }, [loading])

  return (
    <div className="grain relative bg-paper text-ink">
      <Cursor />
      <AnimatePresence>{loading && <Preloader />}</AnimatePresence>
      <TopNav />
      <Hero ready={!loading} />
      <MarqueeBand />
      <Manifesto />
      <Features />
      <TonesDemo />
      <StrokeDemo />
      <Numbers />
      <FinalCta />
      <Footer />
    </div>
  )
}

function Preloader() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1500)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col justify-between bg-ink p-6 text-paper md:p-10"
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="flex justify-between font-display text-xs uppercase tracking-[0.3em] text-paper/60">
        <span>Mòlì · 茉莉</span>
        <span>Загрузка иероглифов</span>
      </div>
      <motion.span
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: EASE }}
        className="self-center font-brush text-[38vw] leading-none text-red md:text-[22vw]"
      >
        学
      </motion.span>
      <div className="flex items-end justify-between">
        <span className="max-w-[16rem] font-serif text-xl italic text-paper/70">xué — учиться, изучать</span>
        <span className="font-display text-7xl font-bold tabular-nums md:text-9xl">{n}</span>
      </div>
    </motion.div>
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
        'fixed inset-x-0 top-0 z-40 transition-all duration-500',
        scrolled ? 'bg-paper/80 py-3 backdrop-blur-md' : 'py-5 md:py-7',
      )}
    >
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 md:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 font-display text-[13px] font-medium uppercase tracking-wider md:flex">
          {[
            ['#method', 'Метод'],
            ['#tones', 'Тоны'],
            ['#strokes', 'Иероглифы'],
            ['#numbers', 'Курс'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="group relative overflow-hidden">
              <span className="block transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-full">{label}</span>
              <span className="absolute inset-0 translate-y-full text-red transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0">
                {label}
              </span>
            </a>
          ))}
        </nav>
        <Link
          to={onboarded ? '/learn' : '/welcome'}
          data-cursor=""
          className="group flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-[13px] font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-red"
        >
          {onboarded ? 'Продолжить' : 'Начать'}
          <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:rotate-45" />
        </Link>
      </div>
    </header>
  )
}

function RevealLine({ children, delay = 0, ready, className }: { children: React.ReactNode; delay?: number; ready: boolean; className?: string }) {
  return (
    <span className={clsx('block overflow-hidden pb-[0.08em]', className)}>
      <motion.span
        className="block"
        initial={{ y: '110%', rotate: 3 }}
        animate={ready ? { y: '0%', rotate: 0 } : undefined}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
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

const FLOATING = [
  { h: '你好', p: 'nǐ hǎo', r: 'привет', x: '55%', y: '52%', rot: -8, d: 0.9 },
  { h: '茶', p: 'chá', r: 'чай', x: '76%', y: '70%', rot: 6, d: 1.1 },
  { h: '爱', p: 'ài', r: 'любить', x: '84%', y: '16%', rot: 10, d: 1.3 },
]

function Hero({ ready }: { ready: boolean }) {
  const navigate = useNavigate()
  const onboarded = useApp((s) => s.onboarded)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yBig = useTransform(scrollYProgress, [0, 1], ['0%', '35%'])
  const rotBig = useTransform(scrollYProgress, [0, 1], [0, -12])
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '-20%'])
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smx = useSpring(mx, { damping: 30, stiffness: 80 })
  const smy = useSpring(my, { damping: 30, stiffness: 80 })

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-5 pb-10 pt-32 md:px-10 md:pb-14"
      onPointerMove={(e) => {
        mx.set(e.clientX / window.innerWidth - 0.5)
        my.set(e.clientY / window.innerHeight - 0.5)
      }}
    >
      <motion.div
        style={{ y: yBig, rotate: rotBig }}
        className="pointer-events-none absolute -right-[8vw] top-[6vh] select-none md:right-[2vw] md:top-[4vh]"
        aria-hidden
      >
        <motion.span
          initial={{ opacity: 0, scale: 1.2, filter: 'blur(30px)' }}
          animate={ready ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 1.6, ease: EASE }}
          className="block font-brush text-[78vw] leading-[0.8] text-red md:text-[46vw]"
        >
          学
        </motion.span>
      </motion.div>

      {FLOATING.map((f) => (
        <FloatCard key={f.h} f={f} mx={smx} my={smy} ready={ready} />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={ready ? { opacity: 1, scale: 1 } : undefined}
        transition={{ delay: 1.2, duration: 0.8, ease: EASE }}
        className="absolute left-[52%] top-[22%] hidden md:block"
      >
        <SealBadge />
      </motion.div>

      <motion.div style={{ y: yText }} className="relative z-10 mx-auto w-full max-w-[1500px]">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-6 flex items-center gap-3 font-display text-xs font-medium uppercase tracking-[0.3em] md:text-sm"
        >
          <span className="h-px w-10 bg-ink" /> Китайский язык · HSK 1 · бесплатно
        </motion.p>
        <h1 className="font-display text-[15vw] font-bold leading-[0.88] tracking-[-0.04em] md:text-[9.6vw]">
          <RevealLine ready={ready} delay={0.1}>
            Говори
          </RevealLine>
          <RevealLine ready={ready} delay={0.2}>
            <span className="inline-flex items-center gap-[0.15em]">
              по
              <span className="inline-flex items-center rounded-full bg-ink px-[0.4em] pb-[0.14em] pt-[0.1em] align-middle font-hanzi text-[0.55em] font-black leading-none tracking-normal text-paper">
                中文
              </span>
            </span>
          </RevealLine>
          <RevealLine ready={ready} delay={0.3}>
            <span className="font-serif font-medium italic tracking-[-0.02em] text-red">играючи</span>
          </RevealLine>
        </h1>
        <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 0.7, duration: 0.9, ease: EASE }}
            className="max-w-md text-lg leading-relaxed text-ink-2 md:text-xl"
          >
            Короткие уроки-игры, тренажёр тонов, рисование иероглифов и умные повторения. Пять минут в день — и через месяц ты
            заговоришь.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 0.85, duration: 0.9, ease: EASE }}
            className="flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <button
                data-cursor="Вперёд"
                onClick={() => navigate(onboarded ? '/learn' : '/welcome')}
                className="group relative flex items-center gap-4 overflow-hidden rounded-full bg-red py-5 pl-8 pr-5 font-display text-sm font-semibold uppercase tracking-wider text-paper md:text-base"
              >
                <span className="absolute inset-0 translate-y-full rounded-full bg-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0" />
                <span className="relative">{onboarded ? 'Продолжить обучение' : 'Начать бесплатно'}</span>
                <span className="relative grid size-10 place-items-center rounded-full bg-paper text-ink transition-transform duration-500 group-hover:rotate-[-45deg]">
                  <ArrowRight size={20} />
                </span>
              </button>
            </Magnetic>
            <a href="#method" className="font-display text-sm font-semibold uppercase tracking-wider underline decoration-2 underline-offset-8 hover:text-red">
              Как это работает
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function FloatCard({
  f,
  mx,
  my,
  ready,
}: {
  f: (typeof FLOATING)[number]
  mx: MotionValue<number>
  my: MotionValue<number>
  ready: boolean
}) {
  const x = useTransform(mx, (v) => v * 60 * f.d)
  const y = useTransform(my, (v) => v * 60 * f.d)
  return (
    <motion.button
      data-cursor="Слушать"
      onClick={() => void speak(f.h)}
      className="absolute z-20 hidden rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-left shadow-[6px_6px_0_#121110] lg:block"
      style={{ left: f.x, top: f.y, x, y, rotate: f.rot }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={ready ? { opacity: 1, scale: 1 } : undefined}
      transition={{ delay: 1 + f.d * 0.3, type: 'spring', damping: 14 }}
      whileHover={{ scale: 1.08, rotate: 0 }}
    >
      <span className="block text-xs text-ink-soft">{f.p}</span>
      <span className="block font-hanzi text-3xl font-black">{f.h}</span>
      <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-red">
        <SpeakerIcon size={12} /> {f.r}
      </span>
    </motion.button>
  )
}

function SealBadge({ size = 150, dark }: { size?: number; dark?: boolean }) {
  const text = 'НАЧНИ УЧИТЬ · 开始学习 · КАЖДЫЙ ДЕНЬ · '
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="spin-slow absolute inset-0">
        <defs>
          <path id="circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className="font-display" fontSize="15.5" fontWeight="600" letterSpacing="2.4" fill={dark ? '#f4efe6' : '#121110'}>
          <textPath href="#circle">{text}</textPath>
        </text>
      </svg>
      <div className="absolute inset-[28%] grid place-items-center rounded-full bg-ink">
        <span className="font-hanzi text-3xl font-black text-paper">茉</span>
      </div>
    </div>
  )
}

function MarqueeBand() {
  const items = allWords.filter((_, i) => i % 3 === 0).slice(0, 18)
  const row = (reverse?: boolean) => (
    <div className={clsx('marquee gap-10 py-5', reverse && 'reverse')} style={{ ['--marquee-speed' as string]: '60s' }}>
      {[...items, ...items].map((w, i) => (
        <span key={i} className="flex shrink-0 items-center gap-10">
          <span className="flex items-baseline gap-3">
            <span className="font-hanzi text-4xl font-black md:text-5xl">{w.hanzi}</span>
            <span className="font-serif text-2xl italic text-paper/60 md:text-3xl">{w.pinyin}</span>
          </span>
          <SparkIcon size={22} className="text-red" />
        </span>
      ))}
    </div>
  )
  return (
    <section className="relative z-10 -rotate-2 scale-105 overflow-hidden bg-ink text-paper">
      {row()}
    </section>
  )
}

const MANIFESTO =
  'Мы превратили один из самых сложных языков мира в игру, в которую хочется возвращаться каждый день. Никакой зубрёжки — только ритм, звук и жест кисти.'

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = MANIFESTO.split(' ')
  return (
    <section id="method" className="relative px-5 py-32 md:px-10 md:py-48">
      <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1fr_3fr]">
        <div className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-red">
          (01) — Манифест
          <p className="mt-6 font-brush text-8xl normal-case tracking-normal text-ink">道</p>
          <p className="mt-2 font-serif text-lg normal-case tracking-normal text-ink-soft italic">dào — путь</p>
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
  const highlight = ['игру,', 'звук', 'кисти.', 'ритм,']
  return (
    <motion.span style={{ opacity }} className={clsx('mr-[0.25em] inline-block', highlight.includes(children) && 'font-serif italic font-medium text-red')}>
      {children}
    </motion.span>
  )
}

const FEATURES = [
  {
    n: '01',
    title: 'Уроки-игры',
    hanzi: '玩',
    text: '8 типов заданий: выбор перевода, аудирование, сборка фраз, пары, тоны, письмо. Сердечки, серии и XP держат в тонусе.',
    bg: '#22a06b',
    demo: 'lesson',
  },
  {
    n: '02',
    title: 'Тоны на слух',
    hanzi: '声',
    text: 'Четыре тона — сердце китайского. Визуальные контуры и озвучка носителя помогут услышать разницу между mā и mà.',
    bg: '#3d7bf7',
    demo: 'tones',
  },
  {
    n: '03',
    title: 'Пиши кистью',
    hanzi: '写',
    text: 'Рисуй иероглифы пальцем прямо на экране. Мы проверим порядок черт и подскажем, если ошибёшься.',
    bg: '#e63b2e',
    demo: 'write',
  },
  {
    n: '04',
    title: 'Умные повторения',
    hanzi: '记',
    text: 'Интервальное повторение напомнит слово ровно тогда, когда ты начнёшь его забывать. Запоминание навсегда.',
    bg: '#f2b33d',
    demo: 'srs',
  },
]

function Features() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%'])
  return (
    <section ref={ref} className="relative h-[400vh] bg-ink text-paper">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-[1500px] items-end justify-between px-5 pt-24 md:px-10 md:pt-28">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-7xl">
            Четыре <span className="font-serif font-medium italic text-red">столпа</span>
          </h2>
          <div className="hidden w-60 md:block">
            <p className="mb-2 font-display text-xs uppercase tracking-[0.3em] text-paper/50">(02) — Метод</p>
            <div className="h-[2px] w-full bg-paper/15">
              <motion.div className="h-full origin-left bg-red" style={{ scaleX: scrollYProgress }} />
            </div>
          </div>
        </div>
        <motion.div style={{ x }} className="flex h-full w-[400%] items-center">
          {FEATURES.map((f) => (
            <div key={f.n} className="flex h-full w-1/4 items-center px-5 md:px-10">
              <div className="relative grid h-[68svh] w-full grid-rows-[auto_1fr] overflow-hidden rounded-[36px] p-7 text-ink md:grid-cols-2 md:grid-rows-1 md:p-12" style={{ background: f.bg }}>
                <span className="pointer-events-none absolute -bottom-16 -left-6 select-none font-brush text-[50vw] leading-none text-black/10 md:text-[28vw]">
                  {f.hanzi}
                </span>
                <div className="relative flex flex-col">
                  <span className="font-display text-sm font-semibold">{f.n} / 04</span>
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
          <HeartIcon size={20} /> <span className="font-bold text-wrong">4</span>
        </div>
        <p className="mt-5 font-display text-lg font-bold">Как сказать «чай»?</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            ['🍵', '茶', true],
            ['💧', '水', false],
            ['☕', '咖啡', false],
            ['🍎', '苹果', false],
          ].map(([e, h, ok]) => (
            <div key={h as string} className={clsx('card3d flex flex-col items-center py-3', ok && '!border-jade !bg-jade-soft')}>
              <span className="text-2xl">{e}</span>
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
              <motion.path
                d={t.path}
                stroke={t.color}
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatDelay: 2 }}
              />
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
          <span className="font-hanzi text-3xl font-black">{h}</span>
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
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="mb-6 font-display text-xs font-semibold uppercase tracking-[0.3em] text-red">(03) — Попробуй сейчас</p>
            <h2 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-8xl">
              Один слог — <span className="font-serif font-medium italic text-red">четыре</span> смысла
            </h2>
          </div>
          <p className="max-w-sm text-lg text-ink-2">Нажми на карточку и послушай, как тон меняет значение слова «ma».</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {TONE_INFO.map((t, i) => (
            <motion.button
              key={t.n}
              data-cursor="Слушать"
              onClick={() => {
                setActive(i)
                void speak(TONE_WORDS[i].h, 0.7)
              }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.1, duration: 0.9, ease: EASE }}
              whileHover={{ y: -10 }}
              className={clsx(
                'group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[28px] border-2 p-5 text-left transition-colors duration-500 md:p-7',
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
                  <span className="font-hanzi text-3xl font-black">{TONE_WORDS[i].h}</span>
                  <span className={clsx('font-serif text-xl italic', active === i ? 'text-white/85' : 'text-ink-soft')}>{TONE_WORDS[i].r}</span>
                </div>
                <p className={clsx('mt-3 hidden text-sm md:block', active === i ? 'text-white/85' : 'text-ink-soft')}>{t.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}

const STROKE_CHARS = [
  { c: '永', p: 'yǒng', r: 'вечность — в нём все 8 базовых черт' },
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
          <p className="mb-6 font-display text-xs font-semibold uppercase tracking-[0.3em] text-red">(04) — Каллиграфия</p>
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-7xl">
            Каждая черта <br />
            <span className="font-serif font-medium italic text-red">имеет значение</span>
          </h2>
          <p className="mt-8 max-w-md text-lg text-ink-2">
            Посмотри, как пишется иероглиф, а потом попробуй сам — мышью или пальцем. Мы проверим порядок черт.
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
                  'grid size-16 place-items-center rounded-2xl border-2 font-hanzi text-3xl font-black transition-all duration-300',
                  i === j ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:-translate-y-1 hover:border-ink',
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
          <div className="relative rounded-[36px] bg-[#fffdf8] p-5 shadow-[16px_16px_0_#121110]" data-cursor={quiz ? 'Пиши' : ''}>
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

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1600)
      setN(Math.round((1 - Math.pow(1 - p, 4)) * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  )
}

function Numbers() {
  const stats = [
    { n: allWords.length, label: 'слов и выражений HSK 1', s: '+' },
    { n: units.length, label: 'тематических юнитов', s: '' },
    { n: allSentences.length, label: 'живых фраз для практики', s: '' },
    { n: 8, label: 'типов интерактивных заданий', s: '' },
  ]
  return (
    <section id="numbers" className="px-5 py-32 md:px-10 md:py-44">
      <div className="mx-auto max-w-[1500px]">
        <p className="mb-14 font-display text-xs font-semibold uppercase tracking-[0.3em] text-red">(05) — Курс в цифрах</p>
        <div className="grid border-t-2 border-ink md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.9, ease: EASE }}
              className={clsx('border-b-2 border-ink py-10 md:border-b-0 md:px-8 md:py-14', i > 0 && 'md:border-l-2')}
            >
              <p className="font-display text-7xl font-bold tracking-[-0.04em] md:text-8xl">
                <Counter to={s.n} suffix={s.s} />
              </p>
              <p className="mt-4 max-w-[12rem] text-lg text-ink-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {units.slice(0, 6).map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.9, ease: EASE }}
              whileHover={{ y: -8, rotate: i % 2 ? 1 : -1 }}
              className="group relative overflow-hidden rounded-[28px] p-7 text-white"
              style={{ background: u.color }}
            >
              <span className="absolute -right-4 -top-8 font-brush text-[140px] leading-none text-white/15 transition-transform duration-700 group-hover:scale-110">{u.hanzi}</span>
              <p className="relative font-display text-xs uppercase tracking-[0.25em] text-white/80">Юнит {u.index + 1}</p>
              <p className="relative mt-12 font-display text-3xl font-bold">{u.title}</p>
              <p className="relative mt-1 text-white/85">{u.subtitle}</p>
              <p className="relative mt-6 flex flex-wrap gap-2">
                {u.words.slice(0, 5).map((w) => (
                  <span key={w.id} className="rounded-full bg-white/20 px-3 py-1 font-hanzi text-sm">
                    {w.hanzi}
                  </span>
                ))}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  const navigate = useNavigate()
  const onboarded = useApp((s) => s.onboarded)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const scale = useTransform(scrollYProgress, [0, 1], [0.7, 1])
  const radius = useTransform(scrollYProgress, [0, 1], [120, 0])
  return (
    <section ref={ref} className="px-0">
      <motion.div style={{ scale, borderRadius: radius }} className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-red px-5 text-center text-paper">
        <div className="marquee absolute top-10 gap-8 opacity-25" style={{ ['--marquee-speed' as string]: '30s' }}>
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['加油', '学习', '中文', '每天', '进步'].map((w) => (
              <span key={`${k}-${w}`} className="font-brush text-7xl">
                {w}
              </span>
            )),
          )}
        </div>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.3em]">(06) — Твой ход</p>
        <h2 className="mt-6 font-display text-[16vw] font-bold leading-[0.85] tracking-[-0.05em] md:text-[11vw]">
          Начни
          <br />
          <span className="font-serif font-medium italic">сегодня</span>
        </h2>
        <div className="mt-6 flex items-center gap-4 text-paper/85">
          <FlameIcon size={28} /> <span className="font-serif text-2xl italic">первая серия ждёт тебя</span>
        </div>
        <Magnetic className="mt-12">
          <button
            data-cursor="Го!"
            onClick={() => navigate(onboarded ? '/learn' : '/welcome')}
            className="grid size-44 place-items-center rounded-full bg-paper font-display text-sm font-bold uppercase tracking-wider text-ink transition-transform duration-500 hover:scale-110 md:size-56 md:text-base"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="font-hanzi text-5xl font-black text-red">开始</span>
              Поехали
            </span>
          </button>
        </Magnetic>
        <div className="absolute bottom-10 left-10 hidden md:block">
          <SealBadge size={130} dark />
        </div>
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
            <p className="mt-3 max-w-sm font-serif text-xl italic text-paper/60">茉莉 — жасмин. Нежный, как первые слова на новом языке.</p>
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
          <span>© {new Date().getFullYear()} Mòlì. Сделано с любовью к языку.</span>
          <span className="flex items-center gap-2">
            <CheckIcon size={16} /> Прогресс хранится в твоём браузере
          </span>
        </div>
      </div>
    </footer>
  )
}
