import { Suspense } from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { StatChips } from './StatChips'

export const NAV = [
  { to: '/learn', label: 'Учить', hanzi: '学' },
  { to: '/practice', label: 'Практика', hanzi: '练' },
  { to: '/characters', label: 'Иероглифы', hanzi: '字' },
  { to: '/tones', label: 'Тоны', hanzi: '声' },
  { to: '/league', label: 'Лига', hanzi: '赛' },
  { to: '/profile', label: 'Профиль', hanzi: '我' },
]

export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col border-r-2 border-paper-3 bg-paper px-3 py-6 md:flex xl:w-64 xl:px-5">
        <div className="mb-8 px-2">
          <Logo className="xl:flex [&>span:last-child]:hidden xl:[&>span:last-child]:inline" to="/" />
        </div>
        <nav className="flex flex-col gap-1.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-4 rounded-2xl border-2 px-3 py-2.5 font-display text-[13px] font-semibold uppercase tracking-wider transition-colors',
                  isActive ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-2 hover:bg-paper-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'grid size-10 shrink-0 place-items-center rounded-xl font-hanzi text-[22px] font-black transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
                      isActive ? 'bg-red text-paper' : 'bg-paper-2 text-ink',
                    )}
                  >
                    {n.hanzi}
                  </span>
                  <span className="hidden xl:inline">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden px-2 xl:block">
          <p className="font-serif text-lg italic leading-snug text-ink-soft">
            «Путь в тысячу ли начинается с первого шага»
          </p>
          <p className="mt-1 font-hanzi text-sm text-ink-soft">千里之行，始于足下</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-paper-3 bg-paper/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo />
        <StatChips />
      </header>

      <main className="md:pl-[88px] xl:pl-64">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pb-28 md:pb-10"
        >
          <Suspense fallback={<div className="grid h-[60vh] place-items-center"><span className="animate-pulse font-brush text-5xl text-red">学</span></div>}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t-2 border-paper-3 bg-paper/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold',
                isActive ? 'text-red' : 'text-ink-soft',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'grid size-9 place-items-center rounded-xl font-hanzi text-lg font-black transition-colors',
                    isActive ? 'bg-red text-paper' : 'bg-paper-2 text-ink',
                  )}
                >
                  {n.hanzi}
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ kicker, title, children }: { kicker: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.25em] text-red">{kicker}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}
