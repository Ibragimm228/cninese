import * as THREE from 'three'
import { SKIN, SKIN_SHADE, canvasTexture, mat, mesh, res, sphere, sweep } from './kit'

export function dirFrom(yaw: number, pitch: number) {
  return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
}

/** The sculpted head surface: full cheeks, a narrow jaw and a small chin. `lift` floats a point above the skin. */
export function headPoint(yaw: number, pitch: number, lift = 0, out = new THREE.Vector3()) {
  const cp = Math.cos(pitch)
  const x = Math.sin(yaw) * cp, y = Math.sin(pitch), z = Math.cos(yaw) * cp
  const low = Math.max(0, -y)
  const jaw = 1 - 0.3 * Math.pow(low, 2.2)
  const wrapped = Math.abs(yaw)
  const cheek = 0.075 * Math.exp(-((wrapped - 0.8) ** 2) / 0.2 - ((pitch + 0.52) ** 2) / 0.09)
  const chin = 0.05 * Math.exp(-(wrapped ** 2) / 0.12 - ((pitch + 1.05) ** 2) / 0.1)
  const brow = -0.012 * Math.exp(-(wrapped ** 2) / 0.5 - ((pitch + 0.1) ** 2) / 0.06)
  const r = 1 + cheek + chin + brow + lift
  return out.set(x * 1.04 * jaw * r, y * 0.95 * r - low * low * 0.02, z * 0.98 * (1 - 0.16 * Math.pow(low, 2.2) * (z > 0 ? 0.4 : 1)) * r)
}

/** Spherical shorthand for points around the head: yaw, pitch, distance from the centre. */
export const sp = (yaw: number, pitch: number, r = 1) => headPoint(yaw, pitch).multiplyScalar(r)

function headGeometry() {
  const g = new THREE.SphereGeometry(1, res(64, 32), res(48, 24))
  const pos = g.attributes.position
  const q = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    headPoint(Math.atan2(x, z), Math.asin(THREE.MathUtils.clamp(y, -1, 1)), 0, q)
    pos.setXYZ(i, q.x, q.y, q.z)
  }
  g.computeVertexNormals()
  return g
}

/** A decal that hugs the head: painted features sit on these instead of being modelled. */
function patch(yaw: number, pitch: number, hw: number, hh: number, lift: number, n0 = 14) {
  const n = res(n0, 6)
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  const q = new THREE.Vector3()
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, w = j / n
      headPoint(yaw + (u - 0.5) * 2 * hw, pitch + (w - 0.5) * 2 * hh, lift, q)
      pos.push(q.x, q.y, q.z)
      uv.push(u, w)
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, c = a + n + 1
      idx.push(a, a + 1, c, a + 1, c + 1, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

let order = 1
function decal(head: THREE.Object3D, geo: THREE.BufferGeometry, map: THREE.Texture, o: { gloss?: boolean; alphaMap?: THREE.Texture } = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    map,
    alphaMap: o.alphaMap ?? null,
    transparent: true,
    depthWrite: false,
    roughness: o.gloss ? 0.12 : 0.6,
    clearcoat: o.gloss ? 1 : 0,
    clearcoatRoughness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const m = new THREE.Mesh(geo, material)
  m.renderOrder = order++
  m.userData.keep = true
  head.add(m)
  return m
}

export type EyeStyle = {
  /** top, middle and bottom of the iris gradient */
  iris: [string, string, string]
  pupil?: string
  lash: string
  /** half width and half height of the opening, as a share of the eye patch */
  w?: number
  h?: number
  /** how much the outer corner lifts */
  tilt?: number
  /** 0 is a round, open upper lid; 1 is flat and stern */
  flat?: number
  irisR?: [number, number]
  lashes?: number
  lashWeight?: number
  spacing?: number
  y?: number
  size?: number
  sparkle?: boolean
}

export type FaceStyle = EyeStyle & {
  brow: string
  /** positive values pull the inner end down into a scowl */
  browTilt?: number
  browWeight?: number
  browArch?: number
  browY?: number
  mouth: Mouth
  blush?: number
  blushLines?: boolean
}

type Mouth = 'smile' | 'flat' | 'frown' | 'smirk' | 'smug' | 'open' | 'grin'

type Pt = [number, number]

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 28): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t
    out.push([
      m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
      m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

function eyeCurves(st: EyeStyle) {
  const w = st.w ?? 0.6, h = st.h ?? 0.62, tilt = st.tilt ?? 0.06, flat = st.flat ?? 0
  const inner: Pt = [-w, -0.05 - tilt * 0.4]
  const outer: Pt = [w, 0.03 + tilt]
  const upper = bezier(inner, [-w * 0.78, h * (1.18 - flat * 0.62)], [w * 0.3, h * (1.3 - flat * 0.6)], outer)
  const lower = bezier(outer, [w * 0.86, -h * 1.02], [-w * 0.62, -h * 1.16], inner)
  return { w, h, inner, outer, upper, lower }
}

/** Paints in eye space: x grows towards the temple, y upwards, both −1…1. */
function pen(ctx: CanvasRenderingContext2D, size: number, side: number) {
  const X = (x: number) => (0.5 + side * x * 0.5) * size
  const Y = (y: number) => (0.5 - y * 0.5) * size
  const trace = (pts: Pt[], move = true) => pts.forEach(([x, y], i) => (i === 0 && move ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))))
  return { X, Y, trace }
}

function eyeMask(st: EyeStyle, side: number) {
  const t = canvasTexture(256, 256, (ctx, s) => {
    const { trace } = pen(ctx, s, side)
    const c = eyeCurves(st)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    trace(c.upper)
    trace(c.lower, false)
    ctx.fill()
  })
  t.colorSpace = THREE.NoColorSpace
  return t
}

function eyeBall(st: EyeStyle) {
  return canvasTexture(512, 512, (ctx, s) => {
    const c = eyeCurves(st)
    const [rxk, ryk] = st.irisR ?? [0.74, 0.96]
    const rx = rxk * c.w * s * 0.5, ry = ryk * c.h * s * 0.5
    const cx = s * 0.5, cy = s * 0.5 + c.h * s * 0.04
    const white = ctx.createLinearGradient(0, 0, 0, s)
    white.addColorStop(0, '#dfe3f1')
    white.addColorStop(0.5, '#ffffff')
    ctx.fillStyle = white
    ctx.fillRect(0, 0, s, s)

    const iris = () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2) }
    const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry)
    g.addColorStop(0, st.iris[0])
    g.addColorStop(0.45, st.iris[1])
    g.addColorStop(1, st.iris[2])
    iris()
    ctx.fillStyle = g
    ctx.fill()

    ctx.save()
    iris()
    ctx.clip()
    // fibres radiating from the pupil
    ctx.strokeStyle = st.iris[2]
    ctx.globalAlpha = 0.28
    ctx.lineWidth = s * 0.006
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * rx * 0.38, cy + Math.sin(a) * ry * 0.38)
      ctx.lineTo(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    // pool of light at the bottom
    const pool = ctx.createRadialGradient(cx, cy + ry * 0.62, 0, cx, cy + ry * 0.62, rx * 0.95)
    pool.addColorStop(0, 'rgba(255,255,255,0.72)')
    pool.addColorStop(0.5, 'rgba(255,255,255,0.22)')
    pool.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = pool
    ctx.fillRect(cx - rx, cy, rx * 2, ry)
    // pupil
    ctx.fillStyle = st.pupil ?? '#0d0b14'
    ctx.beginPath()
    ctx.ellipse(cx, cy - ry * 0.04, rx * 0.44, ry * 0.46, 0, 0, Math.PI * 2)
    ctx.fill()
    // shade under the upper lid
    const shade = ctx.createLinearGradient(0, cy - ry, 0, cy + ry * 0.1)
    shade.addColorStop(0, 'rgba(6,4,18,0.78)')
    shade.addColorStop(1, 'rgba(6,4,18,0)')
    ctx.fillStyle = shade
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 1.1)
    ctx.restore()

    iris()
    ctx.strokeStyle = st.iris[0]
    ctx.lineWidth = s * 0.022
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(cx - rx * 0.36, cy - ry * 0.42, rx * 0.3, ry * 0.2, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + rx * 0.4, cy + ry * 0.46, rx * 0.13, ry * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    if (st.sparkle) {
      ctx.beginPath()
      ctx.ellipse(cx - rx * 0.56, cy - ry * 0.02, rx * 0.08, ry * 0.055, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function lashOverlay(st: EyeStyle, side: number) {
  return canvasTexture(512, 512, (ctx, s) => {
    const { X, Y, trace } = pen(ctx, s, side)
    const c = eyeCurves(st)
    const weight = (st.lashWeight ?? 1) * 0.085
    // soft shadow the lid casts on the eye
    ctx.save()
    ctx.beginPath()
    trace(c.upper)
    trace(c.lower, false)
    ctx.clip()
    const shadow = ctx.createLinearGradient(0, Y(c.h * 1.1), 0, Y(c.h * 0.1))
    shadow.addColorStop(0, 'rgba(40,30,70,0.42)')
    shadow.addColorStop(1, 'rgba(40,30,70,0)')
    ctx.fillStyle = shadow
    ctx.fillRect(0, 0, s, s)
    ctx.restore()

    // upper lash: a blade that thickens towards the temple and ends in a flick
    const top = c.upper.map(([x, y], i): Pt => {
      const t = i / (c.upper.length - 1)
      return [x, y + weight * (0.35 + 0.9 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62))]
    })
    ctx.fillStyle = st.lash
    ctx.beginPath()
    trace(c.upper)
    ctx.lineTo(X(c.outer[0] + 0.15), Y(c.outer[1] + 0.1 + (st.tilt ?? 0.06)))
    trace(top.reverse(), false)
    ctx.closePath()
    ctx.fill()
    for (let k = 0; k < (st.lashes ?? 0); k++) {
      const [x, y] = c.upper[c.upper.length - 4 - k * 4]
      ctx.beginPath()
      ctx.moveTo(X(x - 0.05), Y(y + weight * 0.6))
      ctx.lineTo(X(x + 0.12), Y(y + weight * 2.6 + k * 0.02))
      ctx.lineTo(X(x + 0.06), Y(y + weight * 0.5))
      ctx.fill()
    }
    // lower lash line on the outer third
    ctx.strokeStyle = st.lash
    ctx.lineCap = 'round'
    ctx.lineWidth = s * weight * 0.16
    ctx.beginPath()
    trace(c.lower.slice(0, 11))
    ctx.stroke()
    ctx.globalAlpha = 0.5
    ctx.lineWidth = s * weight * 0.08
    ctx.beginPath()
    trace(c.lower.slice(10))
    ctx.stroke()
    ctx.globalAlpha = 1
    // eyelid crease
    ctx.strokeStyle = SKIN_SHADE
    ctx.lineWidth = s * 0.008
    ctx.beginPath()
    trace(top.reverse().slice(5, 22).map(([x, y]): Pt => [x, y + 0.085]))
    ctx.stroke()
  })
}

function closedEye(st: EyeStyle, side: number, happy: boolean) {
  return canvasTexture(256, 256, (ctx, s) => {
    const { X, Y, trace } = pen(ctx, s, side)
    const c = eyeCurves(st)
    const { w, h } = c
    const line = happy
      ? bezier([-w * 0.92, -h * 0.34], [-w * 0.55, h * 0.62], [w * 0.5, h * 0.66], [w * 0.96, -h * 0.26])
      : bezier([-w, -h * 0.3], [-w * 0.5, -h * 0.82], [w * 0.5, -h * 0.8], [w * 1.02, -h * 0.18])
    ctx.strokeStyle = st.lash
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = s * 0.05 * (st.lashWeight ?? 1)
    ctx.beginPath()
    trace(line)
    ctx.stroke()
    if (!happy) {
      ctx.lineWidth = s * 0.026
      for (const k of [0.72, 0.86, 1]) {
        const [x, y] = line[Math.round((line.length - 1) * k)]
        ctx.beginPath()
        ctx.moveTo(X(x), Y(y))
        ctx.lineTo(X(x + 0.07), Y(y - 0.11))
        ctx.stroke()
      }
    }
  })
}

function browTexture(st: FaceStyle, side: number) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    const X = (x: number) => (0.5 + side * x * 0.5) * w
    const Y = (y: number) => (0.5 - y * 0.5) * h
    const tilt = st.browTilt ?? 0, weight = (st.browWeight ?? 1) * 0.2, arch = st.browArch ?? 0.3
    const spine = bezier([-0.72, -tilt * 0.9], [-0.3, arch - tilt * 0.2], [0.3, arch + tilt * 0.5], [0.78, tilt * 0.55 - 0.1], 20)
    ctx.fillStyle = st.brow
    ctx.beginPath()
    spine.forEach(([x, y], i) => {
      const t = i / 20
      const k = weight * (0.9 - 0.75 * t * t) * (t < 0.08 ? 0.6 + t * 5 : 1)
      if (i === 0) ctx.moveTo(X(x), Y(y + k))
      else ctx.lineTo(X(x), Y(y + k))
    })
    ;[...spine].reverse().forEach(([x, y], i) => {
      const t = 1 - i / 20
      const k = weight * (0.9 - 0.75 * t * t) * (t < 0.08 ? 0.6 + t * 5 : 1)
      ctx.lineTo(X(x), Y(y - k))
    })
    ctx.closePath()
    ctx.fill()
  })
}

function mouthTexture(kind: Mouth, withNose = true) {
  return canvasTexture(256, 256, (ctx, s) => {
    const X = (x: number) => (0.5 + x * 0.5) * s
    const Y = (y: number) => (0.5 - y * 0.5) * s
    const ink = '#7d3a3a'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (withNose) {
      ctx.strokeStyle = SKIN_SHADE
      ctx.lineWidth = s * 0.02
      ctx.beginPath()
      ctx.moveTo(X(-0.035), Y(0.8))
      ctx.quadraticCurveTo(X(0.01), Y(0.74), X(0.04), Y(0.8))
      ctx.stroke()
    }
    ctx.strokeStyle = ink
    ctx.lineWidth = s * 0.026
    const stroke = (pts: Pt[]) => {
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
      ctx.stroke()
    }
    if (kind === 'smile') stroke(bezier([-0.24, 0.04], [-0.12, -0.14], [0.12, -0.14], [0.24, 0.04]))
    if (kind === 'flat') stroke(bezier([-0.17, -0.02], [-0.05, -0.04], [0.05, -0.04], [0.17, -0.02]))
    if (kind === 'frown') stroke(bezier([-0.2, -0.08], [-0.08, 0.02], [0.1, 0.02], [0.2, -0.06]))
    if (kind === 'smirk') {
      stroke(bezier([-0.2, -0.02], [-0.06, -0.1], [0.12, -0.08], [0.26, 0.08]))
      stroke([[0.26, 0.08], [0.29, 0.12]])
    }
    if (kind === 'smug') {
      // lopsided little grin
      ctx.fillStyle = '#8f3f48'
      ctx.beginPath()
      const top = bezier([-0.2, 0.02], [-0.05, 0.0], [0.12, 0.04], [0.27, 0.12])
      const bottom = bezier([0.27, 0.12], [0.2, -0.16], [-0.05, -0.2], [-0.2, 0.02])
      ;[...top, ...bottom].forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
      ctx.fill()
      ctx.stroke()
    }
    if (kind === 'open' || kind === 'grin') {
      const wide = kind === 'grin' ? 0.3 : 0.24
      const deep = kind === 'grin' ? 0.3 : 0.36
      const top = bezier([-wide, 0.08], [-wide * 0.4, 0.04], [wide * 0.4, 0.04], [wide, 0.08])
      const bottom = bezier([wide, 0.08], [wide * 0.86, -deep], [-wide * 0.86, -deep], [-wide, 0.08])
      const shape = () => {
        ctx.beginPath()
        ;[...top, ...bottom].forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
        ctx.closePath()
      }
      shape()
      ctx.fillStyle = '#7a2531'
      ctx.fill()
      ctx.save()
      shape()
      ctx.clip()
      ctx.fillStyle = '#ff8f9c'
      ctx.beginPath()
      ctx.ellipse(X(0), Y(-deep * 0.82), s * wide * 0.36, s * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
      if (kind === 'grin') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(X(-wide), Y(0.09), s * wide, s * 0.035)
      }
      ctx.restore()
      shape()
      ctx.stroke()
    }
  })
}

function blushTexture(lines: boolean) {
  return canvasTexture(128, 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,110,130,0.9)')
    g.addColorStop(0.55, 'rgba(255,110,130,0.35)')
    g.addColorStop(1, 'rgba(255,110,130,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    if (lines) {
      ctx.strokeStyle = 'rgba(235,80,110,0.85)'
      ctx.lineWidth = s * 0.03
      ctx.lineCap = 'round'
      for (const x of [-0.16, 0, 0.16]) {
        ctx.beginPath()
        ctx.moveTo(s * (0.5 + x + 0.04), s * 0.42)
        ctx.lineTo(s * (0.5 + x - 0.04), s * 0.58)
        ctx.stroke()
      }
    }
  })
}

export type Face = {
  eyes: (state: 'open' | 'closed' | 'happy') => void
  mouth: (state: 'rest' | 'open') => void
  gaze: (x: number, y: number) => void
  brows: (lift: number) => void
}

export function buildHead(skinColor = SKIN) {
  const head = new THREE.Group()
  const skin = mat(skinColor, { rough: 0.55, coat: 0.18 })
  const skull = mesh(head, headGeometry(), skin)
  skull.userData.keep = true
  for (const side of [1, -1]) {
    // ears: a shell with a shaded hollow
    const ear = new THREE.Group()
    ear.position.copy(headPoint(side * 1.52, -0.1)).multiplyScalar(0.985)
    ear.rotation.set(0, side * 0.35, side * -0.1)
    head.add(ear)
    mesh(ear, sphere(0.17, 20, 16), skin, [0, 0, 0], [0, 0, 0], [0.42, 1, 0.72])
    mesh(ear, sphere(0.1, 14, 12), mat(SKIN_SHADE, { coat: 0, rough: 0.7 }), [side * 0.045, -0.01, 0.02], [0, 0, 0], [0.3, 0.95, 0.62])
    // helix rim curling round the top, the inner fold and the lobe
    const P = (x: number, y: number, z: number) => new THREE.Vector3(side * x, y, z)
    const out = P(1, 0, 0)
    mesh(ear, sweep([P(0.05, -0.1, 0.085), P(0.062, 0.02, 0.112), P(0.064, 0.12, 0.07), P(0.06, 0.158, -0.01), P(0.05, 0.12, -0.085), P(0.04, 0.0, -0.11), P(0.035, -0.09, -0.07)], { w: 0.034, t: 0.022, back: 1, up: out, profile: (q) => 0.55 + 0.45 * Math.sin(q * Math.PI), sides: 8, seg: 28 }), skin)
    mesh(ear, sweep([P(0.066, 0.075, 0.03), P(0.07, 0.03, -0.035), P(0.068, -0.045, -0.03), P(0.064, -0.075, 0.02)], { w: 0.026, t: 0.016, back: 1, up: out, profile: (q) => 0.5 + 0.5 * Math.sin(q * Math.PI), sides: 8 }), skin)
    mesh(ear, sphere(0.05, 12, 10), skin, [side * 0.035, -0.13, 0.01], [0, 0, 0], [0.5, 0.9, 0.8])
    mesh(ear, sphere(0.028, 10, 8), skin, [side * 0.06, -0.01, 0.075], [0, 0, 0], [0.6, 1.3, 0.8])
  }
  // a button nose, just enough to catch the light in profile
  const nose = mesh(head, sphere(0.034, 16, 12), skin, [0, 0, 0], [0, 0, 0], [1, 0.75, 0.8])
  nose.position.copy(headPoint(0, -0.335, -0.016))
  return { head, skin }
}

export function paintFace(head: THREE.Object3D, st: FaceStyle): Face {
  const size = st.size ?? 1, spacing = st.spacing ?? 0.43, ey = st.y ?? -0.14
  const ball = eyeBall(st)
  const open: THREE.Mesh[] = [], shut: THREE.Mesh[] = [], glad: THREE.Mesh[] = [], brows: THREE.Mesh[] = []
  const balls: THREE.Texture[] = []
  for (const side of [1, -1]) {
    const geo = (lift: number) => patch(side * spacing, ey, 0.37 * size, 0.39 * size, lift)
    const map = ball.clone()
    map.needsUpdate = true
    balls.push(map)
    open.push(decal(head, geo(0.004), map, { gloss: true, alphaMap: eyeMask(st, side) }))
    open.push(decal(head, geo(0.008), lashOverlay(st, side)))
    const closed = decal(head, geo(0.008), closedEye(st, side, false))
    const happy = decal(head, geo(0.008), closedEye(st, side, true))
    closed.visible = happy.visible = false
    shut.push(closed)
    glad.push(happy)
    const brow = decal(head, patch(side * spacing * 1.03, ey + (0.5 + (st.browY ?? 0)) * size, 0.3 * size, 0.15 * size, 0.012), browTexture(st, side))
    brows.push(brow)
    if (st.blush) {
      const blush = decal(head, patch(side * 0.74, -0.5, 0.2, 0.13, 0.006), blushTexture(st.blushLines ?? false))
      ;(blush.material as THREE.MeshPhysicalMaterial).opacity = st.blush
    }
  }
  ball.dispose()
  const mouthGeo = patch(0, -0.6, 0.3, 0.3, 0.006)
  const rest = decal(head, mouthGeo, mouthTexture(st.mouth))
  const wide = decal(head, mouthGeo, mouthTexture(st.mouth === 'frown' || st.mouth === 'flat' ? 'grin' : 'open'))
  wide.visible = false
  return {
    eyes(state) {
      open.forEach((m) => (m.visible = state === 'open'))
      shut.forEach((m) => (m.visible = state === 'closed'))
      glad.forEach((m) => (m.visible = state === 'happy'))
    },
    mouth(state) {
      rest.visible = state === 'rest'
      wide.visible = state === 'open'
    },
    gaze(x, y) {
      balls.forEach((t) => t.offset.set(-x * 0.055, -y * 0.045))
    },
    brows(lift) {
      brows.forEach((b) => (b.rotation.x = -lift * 0.06))
    },
  }
}
