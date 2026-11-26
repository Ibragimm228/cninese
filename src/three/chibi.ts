import * as THREE from 'three'
import type { CompanionId } from '../data/companions'

const UP = new THREE.Vector3(0, 1, 0)
const FRONT = new THREE.Vector3(0, 0, 1)
const SKIN = '#ffd9bd'
const SKIN_SHADE = '#f2b79a'

type MatOpts = { rough?: number; coat?: number; metal?: number; emissive?: string; emissiveIntensity?: number; side?: THREE.Side; sheen?: number }

function mat(color: string, o: MatOpts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: o.rough ?? 0.52,
    metalness: o.metal ?? 0,
    clearcoat: o.coat ?? 0.35,
    clearcoatRoughness: 0.35,
    sheen: o.sheen ?? 0,
    sheenColor: new THREE.Color(color),
    emissive: new THREE.Color(o.emissive ?? '#000000'),
    emissiveIntensity: o.emissiveIntensity ?? 0,
    side: o.side ?? THREE.FrontSide,
  })
}

type V3 = [number, number, number]

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(...pos)
  m.rotation.set(...rot)
  if (typeof scale === 'number') m.scale.setScalar(scale)
  else m.scale.set(...scale)
  m.castShadow = true
  parent.add(m)
  return m
}

const sphere = (r: number, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h)
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 8, 20)

/** A tapered lock of hair whose base sits at the origin and which grows along +Y, curling towards +X. */
function lockGeo(len: number, radius: number, bend = 0.3, flat = 0.6) {
  const g = new THREE.ConeGeometry(radius, len, 12, 8)
  g.translate(0, len / 2, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len
    p.setX(i, p.getX(i) + bend * len * t * t)
    p.setZ(i, p.getZ(i) * flat)
  }
  g.computeVertexNormals()
  return g
}

function dirFrom(yaw: number, pitch: number) {
  return new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
}

/** Plants a hair lock on the head: `yaw`/`pitch` choose the root, `lean` tilts the growth direction. */
function lock(
  parent: THREE.Object3D,
  material: THREE.Material,
  yaw: number,
  pitch: number,
  o: { len: number; r: number; bend?: number; flat?: number; lean?: V3; roll?: number; depth?: number },
) {
  const root = dirFrom(yaw, pitch)
  const grow = root.clone().add(new THREE.Vector3(...(o.lean ?? [0, 0, 0]))).normalize()
  const m = mesh(parent, lockGeo(o.len, o.r, o.bend ?? 0.25, o.flat ?? 0.6), material)
  m.position.copy(root.multiplyScalar(o.depth ?? 0.9))
  m.quaternion.setFromUnitVectors(UP, grow)
  m.rotateY(o.roll ?? 0)
  return m
}

function lathe(points: [number, number][], segments = 40, phiStart = 0, phiLength = Math.PI * 2) {
  // LatheGeometry faces outwards only when the profile climbs
  const profile = points[0][1] > points[points.length - 1][1] ? [...points].reverse() : points
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments, phiStart, phiLength)
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

type EyeOpts = { iris: string; irisDark: string; lash: string; size?: number; tall?: number; sleepy?: number }

function irisTexture(o: EyeOpts) {
  return canvasTexture(256, (ctx, s) => {
    const c = s / 2
    const g = ctx.createLinearGradient(0, 0, 0, s)
    g.addColorStop(0, o.irisDark)
    g.addColorStop(0.55, o.iris)
    g.addColorStop(1, '#ffffff')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c, c, c, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = o.irisDark
    ctx.lineWidth = s * 0.07
    ctx.beginPath()
    ctx.arc(c, c, c - ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 2
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(c + Math.cos(a) * s * 0.2, c + Math.sin(a) * s * 0.2)
      ctx.lineTo(c + Math.cos(a) * s * 0.42, c + Math.sin(a) * s * 0.42)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#12101a'
    ctx.beginPath()
    ctx.ellipse(c, c * 0.95, s * 0.17, s * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(c * 0.68, c * 0.55, s * 0.11, s * 0.13, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(c * 1.34, c * 1.42, s * 0.055, 0, Math.PI * 2)
    ctx.fill()
  })
}

function buildEye(o: EyeOpts, side: 1 | -1) {
  const g = new THREE.Group()
  const size = o.size ?? 1
  const tall = o.tall ?? 1.25
  const white = mat('#ffffff', { rough: 0.25, coat: 1 })
  const lash = mat(o.lash, { rough: 0.6, coat: 0 })
  const lid = new THREE.Group()
  g.add(lid)
  mesh(lid, sphere(0.2), white, [0, 0, 0], [0, 0, 0], [size, size * tall, 0.3])
  const iris = new THREE.Mesh(
    new THREE.CircleGeometry(0.155 * size, 40),
    new THREE.MeshPhysicalMaterial({ map: irisTexture(o), roughness: 0.15, clearcoat: 1 }),
  )
  iris.position.set(-side * 0.012, -0.02 * tall, 0.058)
  iris.scale.set(1, tall * 1.02, 1)
  lid.add(iris)
  // upper lash line with an outer flick
  const lashArc = mesh(lid, new THREE.TorusGeometry(0.2 * size, 0.026, 8, 24, Math.PI * 0.86), lash, [0, 0.02 * tall - (o.sleepy ?? 0) * 0.08, 0.04], [0, 0, Math.PI * 0.07], [1, tall * 0.92, 0.6])
  lashArc.castShadow = false
  mesh(lid, lockGeo(0.11, 0.03, 0.4, 0.5), lash, [side * 0.19 * size, 0.1 * tall, 0.03], [0, 0, -side * 1.15])
  g.userData.lid = lid
  return g
}

type FaceOpts = EyeOpts & { brow: string; browTilt?: number; browY?: number; mouth?: 'smile' | 'flat' | 'smirk' | 'open'; blush?: number }

function buildFace(head: THREE.Object3D, o: FaceOpts) {
  const eyes: THREE.Group[] = []
  for (const side of [1, -1] as const) {
    const d = dirFrom(side * 0.4, -0.13)
    const eye = buildEye(o, side)
    eye.position.copy(d.clone().multiplyScalar(0.95))
    eye.quaternion.setFromUnitVectors(FRONT, d)
    head.add(eye)
    eyes.push(eye)

    const browDir = dirFrom(side * 0.4, 0.2 + (o.browY ?? 0))
    const brow = mesh(head, capsule(0.022, 0.2), mat(o.brow, { rough: 0.7, coat: 0 }))
    brow.position.copy(browDir.clone().multiplyScalar(0.99))
    brow.quaternion.setFromUnitVectors(FRONT, browDir)
    brow.rotateZ(Math.PI / 2 + side * (o.browTilt ?? 0.12))
    brow.castShadow = false

    if (o.blush !== 0) {
      const bd = dirFrom(side * 0.66, -0.4)
      const blush = new THREE.Mesh(
        new THREE.CircleGeometry(0.13, 24),
        new THREE.MeshBasicMaterial({ color: '#ff7f8f', transparent: true, opacity: o.blush ?? 0.32, depthWrite: false }),
      )
      blush.position.copy(bd.clone().multiplyScalar(0.985))
      blush.quaternion.setFromUnitVectors(FRONT, bd)
      blush.scale.set(1.25, 0.7, 1)
      head.add(blush)
    }
  }
  const dark = mat('#6a2a2a', { rough: 0.6, coat: 0 })
  const md = dirFrom(0, -0.52)
  const mouth = new THREE.Group()
  mouth.position.copy(md.clone().multiplyScalar(0.965))
  mouth.quaternion.setFromUnitVectors(FRONT, md)
  head.add(mouth)
  const kind = o.mouth ?? 'smile'
  if (kind === 'smile') mesh(mouth, new THREE.TorusGeometry(0.085, 0.017, 8, 20, Math.PI * 0.8), dark, [0, 0.05, 0], [0, 0, Math.PI * 1.1])
  if (kind === 'flat') mesh(mouth, capsule(0.016, 0.13), dark, [0, 0, 0], [0, 0, Math.PI / 2 + 0.08])
  if (kind === 'smirk') {
    mesh(mouth, new THREE.TorusGeometry(0.1, 0.017, 8, 20, Math.PI * 0.62), dark, [0.02, 0.07, 0], [0, 0, Math.PI * 1.28])
    mesh(mouth, capsule(0.014, 0.04), dark, [0.115, 0.03, 0], [0, 0, -0.5])
  }
  if (kind === 'open') {
    mesh(mouth, sphere(0.07), mat('#7a2b33', { rough: 0.5 }), [0, 0, -0.02], [0, 0, 0], [1.1, 0.85, 0.4])
    mesh(mouth, sphere(0.04), mat('#ff8a94', { rough: 0.5 }), [0, -0.025, 0], [0, 0, 0], [1.1, 0.6, 0.4])
  }
  // tiny nose highlight
  const nd = dirFrom(0, -0.3)
  mesh(head, sphere(0.022, 12, 8), mat(SKIN_SHADE, { rough: 0.6, coat: 0 }), nd.multiplyScalar(1.0).toArray() as V3)
  return { eyes, mouth }
}

function buildHeadBase() {
  const head = new THREE.Group()
  const skin = mat(SKIN, { rough: 0.6, coat: 0.12 })
  // one continuous surface: cheeks swell forward, the chin tapers in
  const geo = sphere(1, 64, 48)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const low = Math.max(0, -y)
    const taper = 1 - low * low * 0.2
    pos.setXYZ(i, x * 1.04 * taper, y * 0.95, z * 0.98)
  }
  geo.computeVertexNormals()
  mesh(head, geo, skin)
  for (const side of [1, -1]) {
    mesh(head, sphere(0.2, 20, 16), skin, [side * 1.0, -0.12, 0], [0, 0, 0], [0.5, 1, 0.75])
    mesh(head, sphere(0.1, 14, 10), mat(SKIN_SHADE, { coat: 0 }), [side * 1.04, -0.12, 0.03], [0, 0, 0], [0.4, 1, 0.7])
  }
  return head
}

function hairCap(material: THREE.Material, tilt = -0.42, cover = 0.56, scale: V3 = [1.09, 1.02, 1.06]) {
  const g = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, 0, Math.PI * cover)
  const m = new THREE.Mesh(g, material)
  m.rotation.x = tilt
  m.scale.set(...scale)
  m.castShadow = true
  return m
}

type Limb = { arm: THREE.Group; hand: THREE.Mesh }

function buildArm(parent: THREE.Object3D, side: 1 | -1, sleeve: THREE.Material, o: { sleeveLen?: number; cuff?: THREE.Material; bare?: boolean; wide?: number } = {}): Limb {
  const arm = new THREE.Group()
  arm.position.set(side * 0.47, 1.14, 0)
  arm.rotation.z = side * 0.32
  parent.add(arm)
  const skin = mat(SKIN, { coat: 0.2 })
  const len = o.sleeveLen ?? 0.42
  const wide = o.wide ?? 1
  if (o.bare) mesh(arm, capsule(0.095, 0.4), skin, [0, -0.3, 0])
  mesh(arm, capsule(0.125 * wide, len), sleeve, [0, -len / 2 - 0.02, 0], [0, 0, 0], [1, 1, 1])
  if (o.cuff) mesh(arm, new THREE.TorusGeometry(0.125 * wide, 0.035, 10, 24), o.cuff, [0, -len - 0.08, 0], [Math.PI / 2, 0, 0])
  const hand = mesh(arm, sphere(0.125, 20, 16), skin, [0, -0.62, 0.02])
  mesh(arm, sphere(0.05, 12, 10), skin, [side * -0.07, -0.63, 0.09])
  return { arm, hand }
}

function buildLegs(parent: THREE.Object3D, leg: THREE.Material, shoe: THREE.Material, o: { sole?: THREE.Material; sock?: THREE.Material; legLen?: number } = {}) {
  for (const side of [1, -1]) {
    mesh(parent, capsule(0.15, o.legLen ?? 0.3), leg, [side * 0.2, 0.36, 0])
    if (o.sock) mesh(parent, capsule(0.155, 0.12), o.sock, [side * 0.2, 0.22, 0])
    mesh(parent, sphere(0.2, 24, 16), shoe, [side * 0.21, 0.1, 0.08], [0, side * 0.12, 0], [1, 0.62, 1.45])
    if (o.sole) mesh(parent, sphere(0.2, 24, 16), o.sole, [side * 0.21, 0.035, 0.08], [0, side * 0.12, 0], [1.04, 0.22, 1.5])
  }
}

export type Chibi = {
  id: CompanionId
  root: THREE.Group
  update: (t: number, dt: number) => void
  wave: () => void
  celebrate: () => void
  look: (x: number, y: number) => void
}

type Parts = {
  root: THREE.Group
  body: THREE.Group
  head: THREE.Group
  hair: THREE.Group
  arms: [Limb, Limb]
  eyes: THREE.Group[]
  sway: THREE.Object3D[]
  tick?: (t: number) => void
}

function skeleton(): Pick<Parts, 'root' | 'body' | 'head' | 'hair' | 'sway'> {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const head = buildHeadBase()
  head.position.set(0, 2.12, 0.02)
  body.add(head)
  mesh(body, capsule(0.13, 0.1), mat(SKIN, { coat: 0.2 }), [0, 1.27, 0])
  const hair = new THREE.Group()
  head.add(hair)
  return { root, body, head, hair, sway: [] }
}

/* ───────────────────────── Chrollo ───────────────────────── */
function chrollo(): Parts {
  const p = skeleton()
  const hairM = mat('#17141f', { rough: 0.3, coat: 0.9 })
  const coat = mat('#1d1a2b', { rough: 0.6, coat: 0.15, sheen: 0.6 })
  const fur = mat('#f4efe6', { rough: 0.95, coat: 0, sheen: 1 })
  const { eyes } = buildFace(p.head, { iris: '#6f6a8f', irisDark: '#1c1930', lash: '#17141f', brow: '#17141f', browTilt: 0.05, mouth: 'smile', blush: 0.16, sleepy: 0.5, tall: 1.12 })

  // slicked-back hair: glossy cap, combed ridges, widow's peak
  p.hair.add(hairCap(hairM, -0.55, 0.57))
  mesh(p.hair, sphere(1, 40, 28), hairM, [0, 0.42, -0.2], [-0.25, 0, 0], [0.99, 0.74, 1.02])
  // comb lines catching the light
  for (let i = -3; i <= 3; i++) {
    mesh(p.hair, new THREE.TorusGeometry(1.01, 0.022, 8, 40, Math.PI * 0.62), hairM, [0, 0.42, -0.2], [-0.25, Math.PI / 2 + i * 0.22, 0.3], [1.02, 0.76, 1])
  }
  lock(p.hair, hairM, 0, 0.74, { len: 0.36, r: 0.2, bend: 0, flat: 0.35, lean: [0, -1.5, 0.75], depth: 0.97 })
  for (const side of [1, -1]) {
    lock(p.hair, hairM, side * 1.2, 0.2, { len: 0.62, r: 0.2, bend: -side * 0.1, flat: 0.5, lean: [side * 0.1, -1.6, 0.25], depth: 0.98 })
    for (let k = 0; k < 4; k++) {
      p.sway.push(lock(p.hair, hairM, Math.PI + side * (0.25 + k * 0.32), 0.05 - k * 0.04, { len: 0.5, r: 0.2, bend: 0.2, flat: 0.6, lean: [0, -1.2, -0.5], depth: 0.92 }))
    }
    // signature orb earrings
    const ear = new THREE.Group()
    ear.position.set(side * 1.06, -0.32, 0.03)
    p.head.add(ear)
    mesh(ear, new THREE.CylinderGeometry(0.012, 0.012, 0.1), mat('#d8d3c6', { metal: 1, rough: 0.2 }), [0, -0.04, 0])
    mesh(ear, sphere(0.115, 24, 18), mat('#3fd0c6', { rough: 0.08, coat: 1, emissive: '#1a8f8a', emissiveIntensity: 0.35 }), [0, -0.19, 0])
    p.sway.push(ear)
  }
  // forehead cross
  const ink = mat('#4a3a86', { rough: 0.7, coat: 0 })
  const fd = dirFrom(0, 0.43)
  const cross = new THREE.Group()
  cross.position.copy(fd.clone().multiplyScalar(0.985))
  cross.quaternion.setFromUnitVectors(FRONT, fd)
  p.head.add(cross)
  mesh(cross, new THREE.BoxGeometry(0.045, 0.24, 0.02), ink)
  mesh(cross, new THREE.BoxGeometry(0.16, 0.045, 0.02), ink, [0, 0.03, 0])

  // long coat
  mesh(p.body, lathe([[0, 1.3], [0.3, 1.28], [0.46, 1.16], [0.45, 0.9], [0.5, 0.6], [0.62, 0.3], [0.7, 0.16], [0.66, 0.13], [0, 0.13]]), coat)
  mesh(p.body, new THREE.BoxGeometry(0.03, 1.0, 0.03), mat('#0d0b14'), [0, 0.66, 0.56], [0.2, 0, 0])
  for (let i = 0; i < 4; i++) mesh(p.body, sphere(0.035, 12, 10), mat('#c9b26a', { metal: 1, rough: 0.25 }), [0.07, 1.0 - i * 0.2, 0.49 + i * 0.035])
  // inverted cross on the back
  const white = mat('#efeadf', { rough: 0.7 })
  mesh(p.body, new THREE.BoxGeometry(0.1, 0.56, 0.03), white, [0, 0.74, -0.52], [-0.12, 0, 0])
  mesh(p.body, new THREE.BoxGeometry(0.32, 0.1, 0.03), white, [0, 0.6, -0.545], [-0.12, 0, 0])
  // fur collar and cuffs
  const tuft = sphere(0.13, 10, 8)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2
    const r = 0.42 + Math.sin(i * 3.1) * 0.03
    mesh(p.body, tuft, fur, [Math.sin(a) * r, 1.27 + Math.sin(i * 1.7) * 0.03 - Math.cos(a) * 0.05, Math.cos(a) * r * 0.9], [i, i * 2, 0], [1 + Math.sin(i * 5) * 0.2, 0.85, 1])
  }
  for (let i = 0; i < 5; i++) for (const side of [1, -1]) mesh(p.body, tuft, fur, [side * (0.2 - i * 0.03), 1.12 - i * 0.11, 0.42 + i * 0.03], [i, side, 0], 0.8)
  const arms = [1, -1].map((side) => {
    const limb = buildArm(p.body, side as 1 | -1, coat, { sleeveLen: 0.46, wide: 1.1 })
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      mesh(limb.arm, tuft, fur, [Math.sin(a) * 0.14, -0.52, Math.cos(a) * 0.14], [i, a, 0], 0.62)
    }
    return limb
  }) as [Limb, Limb]
  buildLegs(p.body, mat('#15131f'), mat('#0e0c14', { rough: 0.3, coat: 0.8 }))

  // floating grimoire
  const book = new THREE.Group()
  book.position.set(-0.78, 1.02, 0.5)
  p.body.add(book)
  const cover = mat('#8b1f2d', { rough: 0.45, coat: 0.5 })
  const page = mat('#f6ecd2', { rough: 0.9, coat: 0 })
  for (const side of [1, -1]) {
    mesh(book, new THREE.BoxGeometry(0.3, 0.035, 0.42), cover, [side * 0.15, 0, 0], [0, 0, side * 0.32])
    mesh(book, new THREE.BoxGeometry(0.27, 0.05, 0.38), page, [side * 0.145, 0.035, 0], [0, 0, side * 0.32])
  }
  mesh(book, new THREE.TorusGeometry(0.07, 0.012, 8, 24), mat('#e8c35a', { metal: 1, rough: 0.2, emissive: '#e8c35a', emissiveIntensity: 0.4 }), [0, 0.22, 0], [Math.PI / 2, 0, 0])
  const glow = new THREE.PointLight('#b78cff', 1.6, 2.2)
  glow.position.set(0, 0.3, 0)
  book.add(glow)
  arms[1].arm.rotation.set(-0.75, 0, -0.45)

  return { ...p, arms, eyes, tick: (t) => { book.position.y = 1.02 + Math.sin(t * 1.6) * 0.05; book.rotation.y = Math.sin(t * 0.7) * 0.35 + 0.3; book.rotation.x = 0.25 } }
}

/* ───────────────────────── Kuroko ───────────────────────── */
function kuroko(): Parts {
  const p = skeleton()
  const hairM = mat('#56b8ea', { rough: 0.38, coat: 0.7 })
  const jersey = mat('#fbfbfd', { rough: 0.6, coat: 0.1 })
  const trim = mat('#1b2a55', { rough: 0.5 })
  const accent = mat('#39a7e0', { rough: 0.5 })
  const { eyes } = buildFace(p.head, { iris: '#58b9e8', irisDark: '#1f5f96', lash: '#3d7fa6', brow: '#5aa9cf', browTilt: -0.02, mouth: 'flat', blush: 0.28, size: 1.08, tall: 1.3 })

  p.hair.add(hairCap(hairM, -0.4, 0.55))
  // soft drooping fringe
  const fringe: [number, number, number][] = [[-0.75, 0.42, 0.2], [-0.5, 0.52, -0.25], [-0.25, 0.56, 0.3], [0, 0.6, -0.2], [0.25, 0.56, 0.25], [0.5, 0.52, -0.3], [0.75, 0.42, 0.2]]
  for (const [yaw, pitch, bend] of fringe) p.sway.push(lock(p.hair, hairM, yaw, pitch, { len: 0.56, r: 0.2, bend, flat: 0.42, lean: [yaw * 0.25, -1.55, 0.55], depth: 0.99 }))
  for (const side of [1, -1]) {
    lock(p.hair, hairM, side * 1.15, 0.3, { len: 0.75, r: 0.22, bend: side * 0.15, flat: 0.5, lean: [side * 0.25, -1.5, 0.2], depth: 0.98 })
    lock(p.hair, hairM, side * 1.5, 0.15, { len: 0.6, r: 0.22, bend: -side * 0.2, flat: 0.5, lean: [side * 0.3, -1.4, -0.1], depth: 0.98 })
  }
  // tousled crown and nape
  for (let i = 0; i < 16; i++) {
    const yaw = (i / 16) * Math.PI * 2 + 0.2
    const pitch = 0.75 + Math.sin(i * 2.3) * 0.2
    p.sway.push(lock(p.hair, hairM, yaw, pitch, { len: 0.34 + (i % 3) * 0.06, r: 0.17, bend: i % 2 ? 0.35 : -0.35, flat: 0.6, lean: [Math.sin(yaw) * 0.4, 0.1, Math.cos(yaw) * 0.4], roll: i, depth: 0.98 }))
  }
  for (let i = 0; i < 9; i++) {
    const yaw = Math.PI + (i - 4) * 0.27
    lock(p.hair, hairM, yaw, 0.1 - Math.abs(i - 4) * 0.02, { len: 0.5, r: 0.2, bend: i % 2 ? 0.2 : -0.2, flat: 0.55, lean: [0, -1.3, -0.35], depth: 0.95 })
  }

  // jersey, shorts
  mesh(p.body, lathe([[0, 1.3], [0.24, 1.29], [0.44, 1.17], [0.43, 0.85], [0.45, 0.62], [0, 0.6]]), jersey)
  mesh(p.body, new THREE.TorusGeometry(0.2, 0.04, 10, 32), trim, [0, 1.27, 0.02], [Math.PI / 2.15, 0, 0])
  mesh(p.body, new THREE.TorusGeometry(0.445, 0.03, 10, 40), trim, [0, 0.64, 0], [Math.PI / 2, 0, 0])
  for (const side of [1, -1]) {
    mesh(p.body, new THREE.BoxGeometry(0.035, 0.5, 0.2), accent, [side * 0.435, 0.9, 0], [0, 0, side * 0.03])
    mesh(p.body, new THREE.TorusGeometry(0.15, 0.03, 10, 24), trim, [side * 0.44, 1.14, 0], [0, Math.PI / 2, 0])
  }
  const number = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({
      transparent: true,
      map: canvasTexture(256, (ctx, s) => {
        ctx.font = `900 ${s * 0.78}px "Arial Black", Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = s * 0.07
        ctx.strokeStyle = '#39a7e0'
        ctx.strokeText('11', s / 2, s / 2)
        ctx.fillStyle = '#1b2a55'
        ctx.fillText('11', s / 2, s / 2)
      }),
    }),
  )
  number.position.set(0, 0.93, 0.452)
  p.body.add(number)
  mesh(p.body, lathe([[0, 0.66], [0.44, 0.66], [0.47, 0.45], [0.44, 0.36], [0, 0.4]]), jersey)
  mesh(p.body, new THREE.TorusGeometry(0.455, 0.025, 10, 40), accent, [0, 0.4, 0], [Math.PI / 2, 0, 0])
  buildLegs(p.body, mat(SKIN, { coat: 0.2 }), mat('#ffffff', { rough: 0.4, coat: 0.6 }), { sole: accent, sock: mat('#ffffff', { rough: 0.8, coat: 0 }) })

  const band = mat('#1b2a55', { rough: 0.85, coat: 0 })
  const arms = [1, -1].map((side) => {
    const limb = buildArm(p.body, side as 1 | -1, jersey, { sleeveLen: 0.08, bare: true })
    mesh(limb.arm, new THREE.CylinderGeometry(0.105, 0.105, 0.1, 20), band, [0, -0.5, 0])
    return limb
  }) as [Limb, Limb]

  // basketball spinning above a raised finger
  arms[0].arm.rotation.set(0, 0, 2.5)
  mesh(arms[0].arm, capsule(0.03, 0.1), mat(SKIN), [0, -0.75, 0.02])
  const ball = mesh(
    arms[0].arm,
    sphere(0.32, 40, 28),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.75,
      clearcoat: 0.1,
      map: canvasTexture(512, (ctx, s) => {
        ctx.fillStyle = '#e8792b'
        ctx.fillRect(0, 0, s, s)
        ctx.fillStyle = '#c95f1c'
        for (let i = 0; i < 2600; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2)
        ctx.strokeStyle = '#1c1512'
        ctx.lineWidth = s * 0.014
        for (const x of [0, 0.25, 0.5, 0.75, 1]) { ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, s); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke()
        for (const x of [0.125, 0.625]) {
          ctx.beginPath()
          ctx.moveTo(x * s, s * 0.08)
          ctx.bezierCurveTo((x + 0.1) * s, s * 0.35, (x + 0.1) * s, s * 0.65, x * s, s * 0.92)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo((x + 0.25) * s, s * 0.08)
          ctx.bezierCurveTo((x + 0.15) * s, s * 0.35, (x + 0.15) * s, s * 0.65, (x + 0.25) * s, s * 0.92)
          ctx.stroke()
        }
      }),
    }),
    [0, -1.16, 0.02],
  )
  return { ...p, arms, eyes, tick: (t) => { ball.rotation.y = t * 5; ball.rotation.z = 0.25 } }
}

/* ───────────────────────── Ichigo ───────────────────────── */
function ichigo(): Parts {
  const p = skeleton()
  const hairM = mat('#ff8a1f', { rough: 0.35, coat: 0.7 })
  const black = mat('#15151b', { rough: 0.75, coat: 0.05, sheen: 0.5 })
  const white = mat('#f4f1ea', { rough: 0.8, coat: 0 })
  const { eyes } = buildFace(p.head, { iris: '#a8622c', irisDark: '#4b2410', lash: '#3a2114', brow: '#c9620d', browTilt: -0.42, browY: -0.03, mouth: 'smirk', blush: 0.12, tall: 1.12, size: 0.98 })

  p.hair.add(hairCap(hairM, -0.42, 0.55))
  // dense, sharp spikes radiating from the crown
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let ring = 0; ring < 5; ring++) {
    const count = [5, 9, 12, 13, 12][ring]
    const pitch = [1.3, 1.02, 0.74, 0.46, 0.2][ring]
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + ring * 0.37
      const frontness = Math.cos(yaw)
      if (ring >= 3 && frontness > 0.45) continue
      const out = dirFrom(yaw, pitch)
      const m = lock(p.hair, hairM, yaw, pitch, {
        len: 0.5 + rnd() * 0.32 - ring * 0.03,
        r: 0.2,
        bend: (rnd() - 0.5) * 0.5,
        flat: 0.62,
        lean: [out.x * 0.5 + (rnd() - 0.5) * 0.5, 0.25 - ring * 0.12, out.z * 0.5 + (rnd() - 0.5) * 0.3],
        roll: rnd() * 6,
        depth: 0.95,
      })
      if (ring < 2) p.sway.push(m)
    }
  }
  // jagged fringe over the brow
  const fringe: [number, number, number, number][] = [[-0.85, 0.48, 0.52, -0.3], [-0.52, 0.6, 0.46, 0.35], [-0.2, 0.66, 0.52, -0.3], [0.12, 0.66, 0.42, 0.3], [0.45, 0.6, 0.5, -0.35], [0.8, 0.5, 0.5, 0.3]]
  for (const [yaw, pitch, len, bend] of fringe) lock(p.hair, hairM, yaw, pitch, { len, r: 0.19, bend, flat: 0.4, lean: [yaw * 0.35, -1.45, 0.6], depth: 0.99 })
  for (const side of [1, -1]) lock(p.hair, hairM, side * 1.2, 0.25, { len: 0.6, r: 0.2, bend: side * 0.25, flat: 0.5, lean: [side * 0.3, -1.4, 0.15], depth: 0.98 })

  // shihakusho
  mesh(p.body, lathe([[0, 1.3], [0.26, 1.29], [0.47, 1.16], [0.45, 0.86], [0.43, 0.7], [0, 0.7]]), black)
  for (const side of [1, -1]) {
    mesh(p.body, new THREE.BoxGeometry(0.075, 0.6, 0.05), white, [side * 0.115, 1.03, 0.41], [0.12, 0, side * 0.42])
    mesh(p.body, new THREE.BoxGeometry(0.1, 0.62, 0.05), black, [side * 0.2, 1.02, 0.425], [0.12, 0, side * 0.42])
  }
  mesh(p.body, new THREE.TorusGeometry(0.44, 0.075, 12, 40), white, [0, 0.72, 0], [Math.PI / 2, 0, 0], [1, 1, 1.25])
  mesh(p.body, sphere(0.09, 16, 12), white, [-0.2, 0.7, 0.44], [0, 0, 0], [1.2, 0.8, 0.7])
  for (const dx of [-0.3, -0.16]) p.sway.push(mesh(p.body, new THREE.BoxGeometry(0.075, 0.36, 0.02), white, [dx, 0.52, 0.5], [0.12, 0, dx + 0.2]))
  // pleated hakama
  const hakama = mesh(p.body, lathe([[0, 0.74], [0.44, 0.72], [0.56, 0.4], [0.66, 0.13], [0.6, 0.1], [0, 0.12]], 44), black)
  const hp = hakama.geometry.attributes.position
  for (let i = 0; i < hp.count; i++) {
    const a = Math.atan2(hp.getZ(i), hp.getX(i))
    const k = 1 + Math.sin(a * 14) * 0.035 * (1 - (hp.getY(i) - 0.1) / 0.64)
    hp.setX(i, hp.getX(i) * k)
    hp.setZ(i, hp.getZ(i) * k)
  }
  hakama.geometry.computeVertexNormals()
  buildLegs(p.body, black, white, { sole: mat('#b99562', { rough: 0.9, coat: 0 }) })
  // crimson rosary strap
  const strap = new THREE.TorusGeometry(0.5, 0.035, 10, 48)
  mesh(p.body, strap, mat('#9c1f25', { rough: 0.5 }), [0, 0.98, 0], [Math.PI / 2 - 0.1, 0.78, 0], [0.98, 1.02, 1.5])
  for (let i = 0; i < 7; i++) mesh(p.body, sphere(0.045, 12, 10), mat('#c7343a', { rough: 0.3, coat: 0.8 }), [0.26 - i * 0.085, 1.2 - i * 0.07, 0.44 + Math.sin(i / 2) * 0.02])

  const arms = [1, -1].map((side) => buildArm(p.body, side as 1 | -1, black, { sleeveLen: 0.4, wide: 1.45 })) as [Limb, Limb]

  // oversized cleaver on the back
  const sword = new THREE.Group()
  sword.position.set(0.1, 1.2, -0.56)
  sword.rotation.set(0, 0, -0.62)
  p.body.add(sword)
  const shape = new THREE.Shape()
  shape.moveTo(-0.16, -0.95)
  shape.lineTo(0.16, -0.95)
  shape.lineTo(0.2, 0.9)
  shape.quadraticCurveTo(0.2, 1.35, -0.14, 1.75)
  shape.lineTo(-0.16, -0.95)
  const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 3 })
  blade.translate(0, 0, -0.025)
  mesh(sword, blade, mat('#1d1d25', { metal: 0.85, rough: 0.28, coat: 0.6 }))
  const edge = new THREE.Shape()
  edge.moveTo(0.1, -0.95)
  edge.lineTo(0.16, -0.95)
  edge.lineTo(0.2, 0.9)
  edge.quadraticCurveTo(0.2, 1.35, -0.14, 1.75)
  edge.quadraticCurveTo(0.12, 1.3, 0.12, 0.9)
  edge.lineTo(0.1, -0.95)
  const edgeGeo = new THREE.ExtrudeGeometry(edge, { depth: 0.066, bevelEnabled: false })
  edgeGeo.translate(0, 0, -0.033)
  mesh(sword, edgeGeo, mat('#e9edf3', { metal: 1, rough: 0.12, coat: 1 }))
  mesh(sword, new THREE.CylinderGeometry(0.055, 0.05, 0.6, 16), white, [0, -1.25, 0])
  for (let i = 0; i < 7; i++) mesh(sword, new THREE.TorusGeometry(0.058, 0.012, 6, 16), mat('#d9d3c4', { rough: 0.9, coat: 0 }), [0, -1.0 - i * 0.08, 0], [Math.PI / 2 + 0.35, 0, 0])
  const ribbon = mesh(sword, new THREE.BoxGeometry(0.07, 0.6, 0.012), white, [0.08, -1.82, 0], [0, 0, 0.5])
  p.sway.push(ribbon)

  return { ...p, arms, eyes }
}

/* ───────────────────────── Anya ───────────────────────── */
function anya(): Parts {
  const p = skeleton()
  const hairM = mat('#f79cc0', { rough: 0.35, coat: 0.75 })
  const dress = mat('#1b1a20', { rough: 0.6, coat: 0.15, sheen: 0.4 })
  const gold = mat('#e2b84e', { metal: 0.9, rough: 0.25 })
  const white = mat('#fdfcf8', { rough: 0.7, coat: 0.1 })
  const { eyes } = buildFace(p.head, { iris: '#5fc28f', irisDark: '#1f6b52', lash: '#7a4a63', brow: '#e486ae', browTilt: 0.2, mouth: 'smirk', blush: 0.42, size: 1.22, tall: 1.28 })

  p.hair.add(hairCap(hairM, -0.3, 0.52, [1.1, 1.04, 1.08]))
  // bob: a bell of hair around the sides and back, open at the face
  const bob = mesh(p.hair, lathe([[1.02, 0.35], [1.1, -0.1], [1.12, -0.5], [1.03, -0.8], [0.9, -0.88], [0.84, -0.8], [0.92, -0.45], [0.94, 0.3]], 48, Math.PI * 0.4, Math.PI * 1.2), mat('#f79cc0', { rough: 0.35, coat: 0.75, side: THREE.DoubleSide }))
  bob.scale.set(1, 1, 0.98)
  // blunt bangs
  for (let i = -4; i <= 4; i++) {
    const yaw = i * 0.2
    p.sway.push(lock(p.hair, hairM, yaw, 0.6 - Math.abs(i) * 0.02, { len: 0.6 - Math.abs(i) * 0.02, r: 0.2, bend: i % 2 ? 0.12 : -0.12, flat: 0.38, lean: [yaw * 0.2, -1.6, 0.55], depth: 0.99 }))
  }
  for (const side of [1, -1]) {
    // face-framing strands that flick outwards
    p.sway.push(lock(p.hair, hairM, side * 0.98, 0.36, { len: 1.15, r: 0.2, bend: side * 0.22, flat: 0.45, lean: [side * 0.1, -1.7, 0.3], depth: 1.0 }))
    lock(p.hair, hairM, side * 1.3, -0.72, { len: 0.42, r: 0.17, bend: side * 0.6, flat: 0.5, lean: [side * 0.9, -0.5, 0.2], depth: 1.12 })
    // horn-shaped hair ornaments
    const horn = new THREE.Group()
    const hd = dirFrom(side * 0.72, 0.9)
    horn.position.copy(hd.clone().multiplyScalar(1.06))
    horn.quaternion.setFromUnitVectors(UP, hd.clone().add(new THREE.Vector3(side * 0.35, 0.1, 0)).normalize())
    p.hair.add(horn)
    mesh(horn, new THREE.CylinderGeometry(0.15, 0.17, 0.07, 24), gold, [0, 0.02, 0])
    mesh(horn, lockGeo(0.36, 0.14, side * 0.12, 1), mat('#1b1a20', { rough: 0.3, coat: 0.9 }), [0, 0.05, 0])
    mesh(horn, sphere(0.035, 12, 10), gold, [side * 0.045, 0.41, 0])
  }
  // ahoge
  p.sway.push(lock(p.hair, hairM, 0.2, 1.45, { len: 0.42, r: 0.06, bend: 0.9, flat: 0.8, lean: [0.2, 0.6, 0], depth: 1.02 }))

  // academy dress with gold trim
  mesh(p.body, lathe([[0, 1.3], [0.22, 1.29], [0.4, 1.17], [0.4, 0.92], [0.5, 0.62], [0.7, 0.34], [0.66, 0.31], [0, 0.4]], 44), dress)
  mesh(p.body, new THREE.TorusGeometry(0.685, 0.028, 10, 48), gold, [0, 0.345, 0], [Math.PI / 2, 0, 0])
  mesh(p.body, new THREE.BoxGeometry(0.035, 0.74, 0.03), gold, [0, 0.74, 0.5], [0.3, 0, 0])
  for (let i = 0; i < 3; i++) mesh(p.body, sphere(0.04, 12, 10), gold, [0, 1.02 - i * 0.2, 0.43 + i * 0.06])
  mesh(p.body, new THREE.TorusGeometry(0.41, 0.025, 10, 40), gold, [0, 0.92, 0], [Math.PI / 2, 0, 0])
  for (const side of [1, -1]) mesh(p.body, sphere(0.16, 20, 14), white, [side * 0.16, 1.24, 0.24], [0.5, side * 0.3, side * 0.5], [1.15, 0.35, 0.8])
  // red ribbon tie
  const red = mat('#d7263d', { rough: 0.5 })
  mesh(p.body, sphere(0.05, 12, 10), red, [0, 1.19, 0.43])
  for (const side of [1, -1]) {
    mesh(p.body, lockGeo(0.17, 0.07, 0, 0.4), red, [0, 1.19, 0.43], [0, 0, side * 1.9])
    mesh(p.body, lockGeo(0.2, 0.05, 0, 0.4), red, [0, 1.18, 0.44], [0.2, 0, side * 2.9])
  }
  buildLegs(p.body, mat(SKIN, { coat: 0.2 }), mat('#1b1a20', { rough: 0.25, coat: 1 }), { sock: white, legLen: 0.26 })

  const arms = [1, -1].map((side) => buildArm(p.body, side as 1 | -1, dress, { sleeveLen: 0.4, cuff: gold })) as [Limb, Limb]
  // a prized peanut held aloft
  arms[1].arm.rotation.set(-0.5, 0, -2.2)
  const shell = mat('#d9a968', { rough: 0.85, coat: 0 })
  const peanut = new THREE.Group()
  peanut.position.set(0, -0.84, 0.03)
  arms[1].arm.add(peanut)
  mesh(peanut, sphere(0.12, 20, 16), shell, [0, 0.07, 0], [0, 0, 0], [1, 1.1, 1])
  mesh(peanut, sphere(0.105, 20, 16), shell, [0, -0.1, 0], [0, 0, 0], [1, 1.1, 1])
  for (let i = 0; i < 6; i++) mesh(peanut, new THREE.TorusGeometry(0.1, 0.008, 6, 20), mat('#b98445', { rough: 0.9, coat: 0 }), [0, 0, 0], [0, (i / 6) * Math.PI, 0], [1, 2.1, 1])

  return { ...p, arms, eyes, tick: (t) => { peanut.rotation.y = t * 1.5 } }
}

const builders: Record<CompanionId, () => Parts> = { chrollo, kuroko, ichigo, anya }

export function createChibi(id: CompanionId, reducedMotion = false): Chibi {
  const parts = builders[id]()
  const { root, body, head, arms, eyes, sway } = parts
  const restArm = arms.map((a) => a.arm.rotation.clone())
  const restSway = sway.map((o) => o.rotation.clone())
  const phase = { chrollo: 0, kuroko: 1.3, ichigo: 2.6, anya: 3.9 }[id]
  let hop = 0
  let cheer = 0
  let nextBlink = 1.5 + phase
  let blink = 0
  const target = new THREE.Vector2()
  const gaze = new THREE.Vector2()

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.receiveShadow = false })

  return {
    id,
    root,
    wave: () => { hop = 1 },
    celebrate: () => { cheer = 1; hop = 1 },
    look: (x, y) => target.set(x, y),
    update(t, dt) {
      const time = reducedMotion ? 0 : t + phase
      parts.tick?.(time)
      // breathing and a gentle weight shift
      body.position.y = Math.sin(time * 1.8) * 0.018
      body.rotation.z = Math.sin(time * 0.9) * 0.02
      body.scale.y = 1 + Math.sin(time * 1.8) * 0.008
      gaze.lerp(target, Math.min(1, dt * 6))
      head.rotation.set(-gaze.y * 0.28 + Math.sin(time * 1.1) * 0.02, gaze.x * 0.5, Math.sin(time * 0.8) * 0.04)
      sway.forEach((o, i) => {
        o.rotation.x = restSway[i].x + Math.sin(time * 2.1 + i * 0.9) * 0.035
        o.rotation.z = restSway[i].z + Math.sin(time * 1.7 + i) * 0.03
      })
      // blink
      nextBlink -= dt
      if (nextBlink <= 0) { blink = 1; nextBlink = 2.4 + Math.random() * 3 }
      blink = Math.max(0, blink - dt * 7)
      const lidScale = 1 - Math.sin(Math.min(1, blink) * Math.PI) * 0.92
      eyes.forEach((e) => ((e.userData.lid as THREE.Group).scale.y = reducedMotion ? 1 : lidScale))

      hop = Math.max(0, hop - dt * 1.5)
      cheer = Math.max(0, cheer - dt * 0.45)
      const h = Math.sin((1 - hop) * Math.PI)
      const bounce = cheer > 0 ? Math.abs(Math.sin(t * 9)) * 0.28 * Math.min(1, cheer * 2) : 0
      root.position.y = hop > 0 ? h * 0.42 + bounce : bounce
      root.rotation.y = hop > 0 && cheer === 0 ? (1 - hop) * Math.PI * 2 * (hop > 0.02 ? 1 : 0) : 0
      const squash = hop > 0 ? 1 + Math.sin((1 - hop) * Math.PI * 2) * 0.06 : 1
      root.scale.set(1 / squash, squash, 1 / squash)
      arms.forEach((a, i) => {
        const side = i === 0 ? 1 : -1
        const r = restArm[i]
        const raise = Math.max(cheer > 0 ? Math.min(1, cheer * 3) : 0, hop > 0 ? h * 0.6 : 0)
        a.arm.rotation.x = r.x * (1 - raise) + Math.sin(time * 1.8 + i) * 0.03
        a.arm.rotation.z = r.z + (side * 2.6 - r.z) * raise + Math.sin(time * 1.8 + i * 2) * 0.03 + (raise > 0 ? Math.sin(t * 14) * 0.18 * raise : 0)
      })
    },
  }
}
