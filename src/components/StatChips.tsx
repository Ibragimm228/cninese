import clsx from 'clsx'
import { useEffect } from 'react'
import { dayKey } from '../lib/date'
import { useApp } from '../lib/store'
import { FlameIcon, GemIcon, HeartIcon } from './icons'

export function StatChips({ className }: { className?: string }) {
  const { streak, gems, hearts, regenHearts, syncStreak, lastActiveDay } = useApp()
  useEffect(() => {
    regenHearts()
    syncStreak()
    const t = setInterval(regenHearts, 30_000)
    return () => clearInterval(t)
  }, [regenHearts, syncStreak])
  const activeToday = lastActiveDay === dayKey()
  return (
    <div className={clsx('flex items-center gap-1 md:gap-2', className)}>
      <Chip title={`Серия: ${streak} дн.`} className={activeToday ? 'text-[#f08a00]' : 'text-ink-soft'}>
        <FlameIcon size={24} className={clsx(!activeToday && 'grayscale opacity-60')} />
        {streak}
      </Chip>
      <Chip title={`Кристаллы: ${gems}`} className="text-sky">
        <GemIcon size={22} />
        {gems}
      </Chip>
      <Chip title={`Сердца: ${hearts}`} className="text-wrong">
        <HeartIcon size={24} empty={hearts === 0} />
        {hearts}
      </Chip>
    </div>
  )
}

function Chip({ children, className, title }: { children: React.ReactNode; className?: string; title: string }) {
  return (
    <div
      title={title}
      className={clsx(
        'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-display text-[15px] font-bold transition-colors hover:bg-paper-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
