import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'

export function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { damping: 28, stiffness: 300, mass: 0.5 })
  const sy = useSpring(y, { damping: 28, stiffness: 300, mass: 0.5 })
  const [hover, setHover] = useState<string | null>(null)
  const [enabled] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)

  useEffect(() => {
    if (!enabled) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor], a, button')
      setHover(t ? (t.dataset.cursor ?? '') : null)
    }
    window.addEventListener('pointermove', move)
    document.documentElement.classList.add('cursor-none-fine')
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.classList.remove('cursor-none-fine')
    }
  }, [enabled, x, y])

  if (!enabled) return null
  const label = hover && hover.length > 0 ? hover : null
  return (
    <>
      <motion.div className="pointer-events-none fixed left-0 top-0 z-[100] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red" style={{ x, y }} />
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[99] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[1.5px] border-ink mix-blend-difference"
        style={{ x: sx, y: sy, borderColor: '#f4efe6' }}
        animate={{ width: label ? 96 : hover !== null ? 64 : 36, height: label ? 96 : hover !== null ? 64 : 36, backgroundColor: label ? '#f4efe6' : 'rgba(0,0,0,0)' }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
      >
        {label && <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink mix-blend-normal" style={{ color: '#0d0e10' }}>{label}</span>}
      </motion.div>
    </>
  )
}
