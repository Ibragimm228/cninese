import clsx from 'clsx'
import { Link } from 'react-router-dom'

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={clsx('group inline-flex items-center gap-2.5', className)} aria-label="Mòlì — на главную">
      <span className="relative grid size-10 place-items-center rounded-xl bg-red text-paper shadow-[0_3px_0_#b82a20] transition-transform duration-500 group-hover:rotate-[-8deg]">
        <span className="font-hanzi text-xl font-black leading-none">茉</span>
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        Mòlì<span className="text-red">.</span>
      </span>
    </Link>
  )
}
