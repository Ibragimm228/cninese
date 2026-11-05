export type PitchFrame = { t: number; hz: number | null; level: number }

export function detectPitch(buf: Float32Array, sampleRate: number): { hz: number | null; level: number } {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / buf.length)
  if (rms < 0.012) return { hz: null, level: rms }
  const minLag = Math.floor(sampleRate / 500)
  const maxLag = Math.floor(sampleRate / 70)
  let best = -1
  let bestCorr = 0
  const n = buf.length - maxLag
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0
    let e1 = 0
    let e2 = 0
    for (let i = 0; i < n; i++) {
      c += buf[i] * buf[i + lag]
      e1 += buf[i] * buf[i]
      e2 += buf[i + lag] * buf[i + lag]
    }
    const norm = c / Math.sqrt(e1 * e2 || 1)
    if (norm > bestCorr) {
      bestCorr = norm
      best = lag
    }
  }
  if (bestCorr < 0.55 || best < 0) return { hz: null, level: rms }
  return { hz: sampleRate / best, level: rms }
}

export async function recordPitch(ms: number, onFrame: (f: PitchFrame) => void, signal?: AbortSignal): Promise<PitchFrame[]> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const ctx = new AudioContext()
  const src = ctx.createMediaStreamSource(stream)
  const an = ctx.createAnalyser()
  an.fftSize = 2048
  src.connect(an)
  const buf = new Float32Array(an.fftSize)
  const frames: PitchFrame[] = []
  const start = performance.now()
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start
      if (t > ms || signal?.aborted) return resolve()
      an.getFloatTimeDomainData(buf)
      const { hz, level } = detectPitch(buf, ctx.sampleRate)
      const f = { t, hz, level }
      frames.push(f)
      onFrame(f)
      requestAnimationFrame(tick)
    }
    tick()
  })
  stream.getTracks().forEach((t) => t.stop())
  void ctx.close()
  return frames
}

/** Trim silence, convert to semitones relative to the speaker's median, normalise to 0..1 over time. */
export function contour(frames: PitchFrame[]): { x: number; y: number }[] {
  const voiced = frames.filter((f) => f.hz)
  if (voiced.length < 4) return []
  const t0 = voiced[0].t
  const t1 = voiced[voiced.length - 1].t || t0 + 1
  const semis = voiced.map((f) => 12 * Math.log2(f.hz! / 100))
  const sorted = [...semis].sort((a, b) => a - b)
  const med = sorted[Math.floor(sorted.length / 2)]
  const smooth = semis.map((_, i) => {
    const w = semis.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b)
    return w[Math.floor(w.length / 2)]
  })
  return voiced.map((f, i) => ({ x: (f.t - t0) / (t1 - t0 || 1), y: Math.max(-1, Math.min(1, (smooth[i] - med) / 6)) }))
}

const REF: Record<number, (x: number) => number> = {
  1: () => 0.55,
  2: (x) => -0.35 + 0.95 * x,
  3: (x) => (x < 0.55 ? -0.2 - 0.6 * (x / 0.55) : -0.8 + 0.7 * ((x - 0.55) / 0.45)),
  4: (x) => 0.7 - 1.5 * x,
}

export function referenceContour(tone: number, n = 40) {
  const f = REF[tone] ?? (() => 0)
  return Array.from({ length: n }, (_, i) => ({ x: i / (n - 1), y: f(i / (n - 1)) }))
}

/** Classify a user contour by slope/shape; returns best-matching tone and a 0..100 score for the target. */
export function scoreContour(points: { x: number; y: number }[], target: number) {
  if (points.length < 4) return { best: null as number | null, score: 0 }
  const errs = [1, 2, 3, 4].map((tone) => {
    const f = REF[tone]
    const pts = points.map((p) => p.y)
    const mean = pts.reduce((a, b) => a + b, 0) / pts.length
    const refMean = points.reduce((a, p) => a + f(p.x), 0) / points.length
    const e = points.reduce((a, p) => a + (p.y - mean - (f(p.x) - refMean)) ** 2, 0) / points.length
    return { tone, e }
  })
  errs.sort((a, b) => a.e - b.e)
  const tErr = errs.find((x) => x.tone === target)!.e
  return { best: errs[0].tone, score: Math.round(Math.max(0, Math.min(100, 100 - tErr * 160))) }
}
