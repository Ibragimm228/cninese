import { Suspense } from 'react'
import clsx from 'clsx'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { StatChips } from './StatChips'

export const NAV = [
  { to: '/learn', label: 'Учить', hanzi: '学' },
  { to: '/practice', label: 'Практика', hanzi: '练' },
  { to: '/characters', label: 'Иероглифы', hanzi: '字' },
  { to: '/tones', label: 'Тоны', hanzi: '声' },
  { to: '/exam', label: 'HSK тест', hanzi: '考' },
  { to: '/league', label: 'Лига', hanzi: '赛' },
  { to: '/profile', label: 'Профиль', hanzi: '我' },
]

export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="app-shell min-h-dvh">
      <aside className="app-sidebar">
        <div className="app-brand">
          <Logo className="xl:flex [&>span:last-child]:hidden xl:[&>span:last-child]:inline" to="/" />
        </div>
        <nav className="app-nav" aria-label="Разделы">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              aria-label={n.label}
              title={n.label}
              className="app-nav-link"
            >
              {({ isActive }) => (
                <>
                  <span className="app-nav-glyph" aria-hidden="true">
                    {n.hanzi}
                  </span>
                  <span className="app-nav-text">{n.label}</span>
                  {isActive && <span className="app-nav-active" aria-hidden="true">↗</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <Logo className="md:hidden" />
          <StatChips />
        </header>
        <main key={pathname} className="app-scene pb-28 md:pb-10">
          <Suspense fallback={<div className="grid h-[60vh] place-items-center"><span className="animate-pulse font-brush text-5xl text-red">学</span></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav aria-label="Разделы" className="app-dock">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} title={n.label} className={clsx('app-dock-link', n.to === '/league' && 'app-dock-link--wide')}>
            <span className="app-dock-glyph" aria-hidden="true">{n.hanzi}</span>
            <span className="app-dock-text">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="page-title">{title}<span aria-hidden="true">.</span></h1>
      {children}
    </div>
  )
}
