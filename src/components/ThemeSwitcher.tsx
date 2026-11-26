import { useEffect, useLayoutEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { useApp } from '../lib/store'
import { isTheme, themes, type ThemeId } from '../lib/theme'

export function ThemeSwitcher() {
  const theme = useApp((s) => (isTheme(s.theme) ? s.theme : 'moli'))
  const setTheme = useApp((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const current = themes.find((t) => t.id === theme)!

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const pick = (id: ThemeId, e: MouseEvent) => {
    const root = document.documentElement
    root.style.setProperty('--reveal-x', `${e.clientX}px`)
    root.style.setProperty('--reveal-y', `${e.clientY}px`)
    const apply = () => {
      setTheme(id)
      setOpen(false)
    }
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || still) apply()
    else document.startViewTransition(() => flushSync(apply))
  }

  return (
    <>
      <div className="theme-backdrop" aria-hidden="true"><i /><i /><i /></div>
      <button type="button" className="theme-fab" onClick={() => setOpen(true)} aria-label={`Сменить дизайн. Сейчас: ${current.name}`} title="Сменить дизайн">
        <span aria-hidden="true">{current.hanzi}</span>
      </button>
      {open && (
        <div className="theme-sheet" role="dialog" aria-modal="true" aria-label="Выбор дизайна">
          <header>
            <span>Дизайн · {themes.length}</span>
            <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
          </header>
          <div className="theme-grid">
            {themes.map((t) => (
              <button key={t.id} type="button" className="theme-tile" data-id={t.id} aria-pressed={t.id === theme} onClick={(e) => pick(t.id, e)}
                style={{ '--t-bg': t.swatch[0], '--t-ink': t.swatch[1], '--t-accent': t.swatch[2] } as CSSProperties}>
                <em aria-hidden="true">{t.swatch.map((c) => <i key={c} style={{ background: c }} />)}</em>
                <b aria-hidden="true">{t.hanzi}</b>
                <span><strong>{t.name}</strong><small>{t.mood}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
