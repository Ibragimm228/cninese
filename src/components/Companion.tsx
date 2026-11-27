import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { companionFor, companions, type Companion } from '../data/companions'
import { addDays, dayKey } from '../lib/date'
import { learnedWords } from '../lib/progress'
import { useApp, type CompletionOutcome } from '../lib/store'
import { auraTier, Companion3D, CompanionPortrait, type Companion3DHandle } from './Companion3D'
import { ArrowUpRight } from './icons'

function palette(companion: Companion): CSSProperties {
  return { '--pet-color': companion.color, '--pet-ink': companion.ink } as CSSProperties
}

export function CompanionCard() {
  const companion = useApp((s) => companionFor(s.companionId))
  const streak = useApp((s) => s.streak)
  // a companion left alone for a whole day dozes off until the next lesson
  const sleepy = useApp((s) => !!s.lastActiveDay && s.lastActiveDay < addDays(dayKey(), -1))
  const stage = useRef<Companion3DHandle>(null)

  return (
    <section className="pet-card" style={palette(companion)} aria-label={`Спутник серии: ${companion.name}`}>
      <div className="pet-stage">
        <span className="pet-glyph" aria-hidden="true">{companion.glyph}</span>
        <Companion3D ref={stage} ids={[companion.id]} tier={auraTier(streak)} accent={companion.color} sleepy={sleepy} className="pet-canvas" />
        {sleepy && <span className="pet-zzz" aria-label="Спит">Zzz</span>}
        <span className="pet-counter"><strong>{streak}</strong> дн.</span>
        <Link className="editorial-icon pet-swap" to="/profile#companions" aria-label="Выбрать спутника"><ArrowUpRight size={17} /></Link>
      </div>
      <div className="pet-caption">
        <h2>{companion.name}</h2>
        <button type="button" onClick={() => stage.current?.wave()} aria-label={`Поздороваться: ${companion.name}`}>嗨</button>
      </div>
    </section>
  )
}

export function CompanionPicker() {
  const selected = useApp((s) => s.companionId)
  const select = useApp((s) => s.setCompanion)
  const streak = useApp((s) => s.streak)
  const current = companionFor(selected)
  return (
    <section id="companions" className="pet-picker" style={palette(current)} aria-labelledby="companions-heading">
      <div className="pet-picker-stage">
        <span className="pet-glyph" aria-hidden="true">{current.glyph}</span>
        <Companion3D ids={[selected]} tier={auraTier(streak)} accent={current.color} pedestal className="pet-canvas" />
        <ShareCard companion={current} />
        <div className="pet-picker-name">
          <h2 id="companions-heading">{current.name}</h2>
          <p>{current.series}</p>
        </div>
      </div>
      <div className="pet-roster">
        {companions.map((companion) => (
          <button key={companion.id} type="button" className="pet-option" style={palette(companion)} aria-pressed={selected === companion.id} aria-label={companion.name} title={companion.name} onClick={() => select(companion.id)}>
            <CompanionPortrait id={companion.id} />
          </button>
        ))}
      </div>
    </section>
  )
}

export type LessonBuddyHandle = { react: (ok: boolean, streak?: number) => void }

const CHEERS = [['对！', 'верно'], ['很好！', 'очень хорошо'], ['太棒了！', 'отлично'], ['厉害！', 'круто']]
const COMFORTS = [['加油！', 'держись'], ['没关系', 'ничего страшного'], ['再来！', 'ещё раз']]

/** The companion watches the lesson from the corner and reacts to every answer. */
export function LessonBuddy({ ref }: { ref?: Ref<LessonBuddyHandle> }) {
  const companion = useApp((s) => companionFor(s.companionId))
  const stage = useRef<Companion3DHandle>(null)
  const [line, setLine] = useState<{ zh: string; ru: string; ok: boolean; n: number } | null>(null)
  const misses = useRef(0)
  useImperativeHandle(ref, () => ({
    react: (ok, streak = 0) => {
      // every third answer in a row earns the signature move; every second mistake a shake of the head
      misses.current = ok ? 0 : misses.current + 1
      stage.current?.react(ok ? 'happy' : 'sad', ok ? streak > 0 && streak % 3 === 0 : misses.current % 2 === 0)
      const pool = ok ? CHEERS : COMFORTS
      const [zh, ru] = pool[Math.floor(Math.random() * pool.length)]
      setLine((prev) => ({ zh, ru, ok, n: (prev?.n ?? 0) + 1 }))
    },
  }))
  useEffect(() => {
    if (!line) return
    const t = setTimeout(() => setLine(null), 2200)
    return () => clearTimeout(t)
  }, [line])
  return (
    <aside className="lesson-buddy" style={palette(companion)} aria-hidden="true">
      {line && <p key={line.n} className="lesson-buddy-line" data-ok={line.ok}><strong>{line.zh}</strong><span>{line.ru}</span></p>}
      <Companion3D ref={stage} ids={[companion.id]} accent={companion.color} interactive={false} lite zoom={1.15} className="lesson-buddy-canvas" />
    </aside>
  )
}

export function CompanionCelebration({ outcome }: { outcome: CompletionOutcome }) {
  const companion = useApp((s) => companionFor(s.companionId))
  const message = outcome.streakExtended ? `Серия +1 · ${outcome.streak} дн.` : outcome.goalReached ? 'Цель дня!' : '加油！'
  return (
    <div className="pet-celebration" style={palette(companion)}>
      <Companion3D ids={[companion.id]} tier={auraTier(outcome.streak)} accent={companion.color} celebrateOnMount className="pet-celebration-canvas" />
      <strong>{message}</strong>
    </div>
  )
}

/** Bonus: a collectible poster of the companion with the learner's streak, saved as a PNG. */
function ShareCard({ companion }: { companion: Companion }) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!url) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setUrl(null)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('keydown', close)
      URL.revokeObjectURL(url)
    }
  }, [url])

  const make = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const s = useApp.getState()
      const { drawShareCard } = await import('../lib/shareCard')
      setUrl(await drawShareCard({ companion, name: s.name, streak: s.streak, xp: s.xp, words: learnedWords(s).length, tier: auraTier(s.streak) }))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="pet-share" onClick={make} disabled={busy} aria-label="Создать карточку серии" title="Карточка серии">{busy ? '…' : failed ? 'Не вышло' : '✦ Карточка'}</button>
      {url && createPortal(
        <div className="share-sheet" role="dialog" aria-modal="true" aria-label="Карточка серии" onClick={() => setUrl(null)}>
          <img src={url} alt={`Карточка серии: ${companion.name}`} onClick={(e) => e.stopPropagation()} />
          <a href={url} download={`moli-${companion.id}.png`} className="editorial-cta" onClick={(e) => e.stopPropagation()}>Скачать <span>↓</span></a>
        </div>,
        document.body,
      )}
    </>
  )
}
