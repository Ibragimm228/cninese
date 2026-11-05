import HanziWriter from 'hanzi-writer'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'

export type HanziWriterHandle = { animate: () => void; quiz: () => void; demo: () => void }

type Props = {
  char: string
  size?: number
  mode?: 'animate' | 'quiz' | 'static'
  loop?: boolean
  color?: string
  showGrid?: boolean
  onQuizComplete?: (mistakes: number) => void
  onMistake?: () => void
  ref?: Ref<HanziWriterHandle>
}

export function HanziWriterBox({
  char,
  size = 240,
  mode = 'animate',
  loop = false,
  color = '#121110',
  showGrid = true,
  onQuizComplete,
  onMistake,
  ref,
}: Props) {
  const el = useRef<HTMLDivElement>(null)
  const writer = useRef<HanziWriter | null>(null)
  const [error, setError] = useState(false)
  const cbs = useRef({ onQuizComplete, onMistake })
  cbs.current = { onQuizComplete, onMistake }

  useEffect(() => {
    if (!el.current) return
    el.current.innerHTML = ''
    setError(false)
    const w = HanziWriter.create(el.current, char, {
      width: size,
      height: size,
      padding: size * 0.06,
      strokeColor: color,
      radicalColor: '#e63b2e',
      outlineColor: '#e0d7c5',
      drawingColor: '#121110',
      highlightColor: '#22a06b',
      drawingWidth: Math.max(14, size / 14),
      strokeAnimationSpeed: 1.1,
      delayBetweenStrokes: 180,
      showOutline: true,
      showCharacter: mode !== 'quiz',
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      onLoadCharDataError: () => setError(true),
    })
    writer.current = w
    if (mode === 'animate') {
      if (loop) void w.loopCharacterAnimation()
      else void w.animateCharacter()
    }
    if (mode === 'quiz') {
      void w.quiz({
        onMistake: () => cbs.current.onMistake?.(),
        onComplete: (d: { totalMistakes: number }) => cbs.current.onQuizComplete?.(d.totalMistakes),
      })
    }
    return () => {
      writer.current = null
      if (el.current) el.current.innerHTML = ''
    }
  }, [char, size, mode, loop, color])

  useImperativeHandle(ref, () => {
    const quiz = () => {
      writer.current?.hideCharacter()
      void writer.current?.quiz({
        onMistake: () => cbs.current.onMistake?.(),
        onComplete: (d: { totalMistakes: number }) => cbs.current.onQuizComplete?.(d.totalMistakes),
      })
    }
    return {
      animate: () => void writer.current?.animateCharacter(),
      quiz,
      demo: () => {
        const w = writer.current
        if (!w) return
        w.cancelQuiz()
        void w.animateCharacter().then(() => setTimeout(quiz, 500))
      },
    }
  })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {showGrid && (
        <svg className="pointer-events-none absolute inset-0" width={size} height={size} aria-hidden>
          <rect x="1" y="1" width={size - 2} height={size - 2} fill="none" stroke="#e0d7c5" strokeWidth="2" rx="10" />
          <path
            d={`M0 0 L${size} ${size} M${size} 0 L0 ${size} M${size / 2} 0 V${size} M0 ${size / 2} H${size}`}
            stroke="#e0d7c5"
            strokeDasharray="6 6"
            strokeWidth="1.2"
          />
        </svg>
      )}
      <div ref={el} className="relative touch-none" />
      {error && (
        <div className="absolute inset-0 grid place-items-center font-hanzi text-ink" style={{ fontSize: size * 0.7 }}>
          {char}
        </div>
      )}
    </div>
  )
}
