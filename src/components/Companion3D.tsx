import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useReducedMotion } from 'framer-motion'
import { companionFor, type CompanionId } from '../data/companions'
import type { ChibiStage, StageOptions } from '../three/stage'
import { CompanionArt } from './CompanionArt'

export type Companion3DHandle = { wave: () => void; celebrate: () => void }

const loadStage = () => import('../three/stage')

/** Streak milestones unlock an aura around the companion. */
export function auraTier(streak: number) {
  return streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0
}

export function Companion3D({
  ids,
  className,
  tier = 0,
  accent,
  pedestal,
  zoom,
  interactive = true,
  celebrateOnMount,
  ref,
}: {
  ids: readonly CompanionId[]
  className?: string
  celebrateOnMount?: boolean
  ref?: Ref<Companion3DHandle>
} & Pick<StageOptions, 'tier' | 'accent' | 'pedestal' | 'zoom' | 'interactive'>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<ChibiStage | null>(null)
  const reducedMotion = useReducedMotion() ?? false
  const [failed, setFailed] = useState(false)
  const key = ids.join(',')

  useImperativeHandle(ref, () => ({
    wave: () => stage.current?.wave(),
    celebrate: () => stage.current?.celebrate(),
  }))

  useEffect(() => {
    let cancelled = false
    loadStage()
      .then(({ ChibiStage }) => {
        if (cancelled || !canvas.current) return
        stage.current = new ChibiStage(canvas.current, key.split(',') as CompanionId[], { tier, accent, pedestal, zoom, interactive, reducedMotion })
        const made = stage.current
        made.ready.then(
          () => { if (!cancelled && celebrateOnMount) made.celebrate() },
          () => { if (!cancelled) setFailed(true) },
        )
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      stage.current?.dispose()
      stage.current = null
    }
    // the stage is rebuilt only when the cast or motion preference changes
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reducedMotion])

  useEffect(() => stage.current?.setTier(tier), [tier])

  if (failed) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
        {ids.map((id) => <CompanionArt key={id} companion={companionFor(id)} className="h-full max-w-[60%]" />)}
      </div>
    )
  }
  return <canvas ref={canvas} className={className} style={{ touchAction: 'pan-y', cursor: interactive ? 'grab' : undefined }} aria-hidden="true" />
}

export function CompanionPortrait({ id, className }: { id: CompanionId; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadStage()
      .then(({ portrait }) => portrait(id))
      .then((url) => !cancelled && setSrc(url))
      .catch(() => setFailed(true))
    return () => { cancelled = true }
  }, [id])
  if (failed) return <CompanionArt companion={companionFor(id)} className={className} />
  return src ? <img src={src} className={className} alt="" draggable={false} /> : <span className={className} />
}
