import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ink' | 'jade' | 'wrong' | 'ghost' | 'gold' | 'sky' | 'paper'

const styles: Record<Variant, { cls: string; shadow: string }> = {
  primary: { cls: 'bg-red text-paper', shadow: '#b82a20' },
  ink: { cls: 'bg-ink text-paper', shadow: '#000' },
  jade: { cls: 'bg-jade text-white', shadow: '#17784f' },
  wrong: { cls: 'bg-wrong text-white', shadow: '#b3282d' },
  gold: { cls: 'bg-gold text-ink', shadow: '#c98a17' },
  sky: { cls: 'bg-sky text-white', shadow: '#2557c2' },
  paper: { cls: 'bg-[#fffdf8] text-ink border-2 border-paper-3', shadow: '#e0d7c5' },
  ghost: { cls: 'bg-transparent text-ink-soft border-2 border-paper-3', shadow: '#e0d7c5' },
}

export function Button({
  variant = 'primary',
  className,
  disabledLook,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; disabledLook?: boolean }) {
  const s = styles[variant]
  const off = props.disabled || disabledLook
  return (
    <button
      {...props}
      className={clsx(
        'btn3d px-6 py-3.5 text-sm md:text-[15px]',
        off ? 'bg-paper-3 text-ink-soft/60' : s.cls,
        className,
      )}
      style={{ ['--btn-shadow' as string]: off ? '#d3c9b5' : s.shadow, ...props.style }}
    />
  )
}
