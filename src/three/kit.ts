import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type V3 = [number, number, number]

export const SKIN = '#ffdcc4'
export const SKIN_SHADE = '#eeb096'

type MatOpts = {
  rough?: number
  coat?: number
  metal?: number
  emissive?: string
  glow?: number
  side?: THREE.Side
  sheen?: number
  sheenColor?: string
  map?: THREE.Texture
  bump?: THREE.Texture
  bumpScale?: number
  flat?: boolean
}

export function mat(color: string, o: MatOpts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: o.rough ?? 0.5,
    metalness: o.metal ?? 0,
    clearcoat: o.coat ?? 0.3,
    clearcoatRoughness: 0.3,
    sheen: o.sheen ?? 0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(o.sheenColor ?? color),
    emissive: new THREE.Color(o.emissive ?? '#000000'),
    emissiveIntensity: o.glow ?? 0,
    side: o.side ?? THREE.FrontSide,
    map: o.map ?? null,
    bumpMap: o.bump ?? null,
    bumpScale: o.bumpScale ?? 1,
    flatShading: o.flat ?? false,
  })
}

export function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 | number = 1) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(...pos)
  m.rotation.set(...rot)
  if (typeof scale === 'number') m.scale.setScalar(scale)
  else m.scale.set(...scale)
  m.castShadow = true
  parent.add(m)
  return m
}

export function group(parent: THREE.Object3D, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) {
  const g = new THREE.Group()
  g.position.set(...pos)
  g.rotation.set(...rot)
  parent.add(g)
  return g
}

let quality = 1
/** Tessellation scale for everything built afterwards: 1 is the full-detail model, 0.5 a quarter of the triangles. */
export function setDetail(q: number) {
  quality = q
}
export const detail = () => quality
/** Segment count at the current detail level. */
export const res = (n: number, min = 3) => Math.max(min, Math.round(n * 1.6 * quality))

export const sphere = (r: number, w = 28, h = 20) => new THREE.SphereGeometry(r, res(w, 6), res(h, 4))
export const capsule = (r: number, len: number, seg = 18, cap = 8) => new THREE.CapsuleGeometry(r, len, res(cap, 3), res(seg, 6))
export const cyl = (rTop: number, rBottom: number, h: number, seg = 28, open = false) => new THREE.CylinderGeometry(rTop, rBottom, h, res(seg, 6), 1, open)
export const torus = (r: number, tube: number, arc = Math.PI * 2, seg = 40) => new THREE.TorusGeometry(r, tube, res(10, 5), res(seg, 8), arc)
export const box = (w: number, h: number, d: number, bevel = Math.min(w, h, d) * 0.18) => {
  const g = new RoundedBoxGeometry(w, h, d, res(2, 1), bevel)
  return g
}
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Deterministic noise so every build of a character is identical. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function lathe(points: [number, number][], segments = 40, phiStart = 0, phiLength = Math.PI * 2) {
  // LatheGeometry faces outwards only when the profile climbs
  const profile = points[0][1] > points[points.length - 1][1] ? [...points].reverse() : points
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), res(segments, 8), phiStart, phiLength)
}

/** A smooth lathe: the profile is resampled along a spline first. */
export function turned(points: [number, number][], segments = 40, steps = 28, phiStart = Math.PI) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const pts = curve.getPoints(res(steps, 6)).map((p) => [Math.max(0.0001, p.x), p.y] as [number, number])
  return lathe(pts, segments, phiStart)
}

const defaultTaper = (s: number) => (s < 0.22 ? 0.72 + (0.28 * s) / 0.22 : 1 - Math.pow((s - 0.22) / 0.78, 1.7))

export type SweepOpts = {
  /** full width across the ribbon */
  w: number
  /** thickness on the outer face; defaults to a third of the width */
  t?: number
  /** thickness of the inner face relative to the outer one */
  back?: number
  profile?: (s: number) => number
  /** the ribbon faces away from this point… */
  center?: THREE.Vector3
  /** …or along this fixed direction */
  up?: THREE.Vector3
  seg?: number
  sides?: number
  /** rotation of the cross-section along the length, in radians */
  twist?: number
  closed?: boolean
  /** grooves across the outer face, so a lock reads as a bundle of strands */
  ridges?: number
  /** groove depth relative to the thickness */
  groove?: number
}

/**
 * Sweeps a lens-shaped cross-section along a spline. With the default profile it makes a tapered
 * lock of hair; with a constant profile a strap, cord or trim.
 */
export function sweep(points: THREE.Vector3[], o: SweepOpts) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const seg = res(o.seg ?? Math.max(8, points.length * 5), 6)
  const perRidge = quality >= 0.45 ? Math.max(4, Math.round(6 * Math.min(1, quality * 1.25))) : 0
  const ridges = perRidge ? (o.ridges ?? 0) : 0
  const outer = ridges * perRidge
  const sides = ridges ? outer + Math.max(6, Math.round(ridges * 1.2)) : res(o.sides ?? 10, 4)
  const groove = o.groove ?? 0.34
  const profile = o.profile ?? defaultTaper
  const thick = o.t ?? o.w / 3
  const back = o.back ?? 0.45
  const center = o.center ?? new THREE.Vector3()
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new THREE.Vector3(), tan = new THREE.Vector3(), hint = new THREE.Vector3(), b = new THREE.Vector3(1, 0, 0), n = new THREE.Vector3()
  for (let i = 0; i <= seg; i++) {
    const s = i / seg
    curve.getPoint(s, p)
    curve.getTangent(s, tan)
    if (o.up) hint.copy(o.up)
    else hint.copy(p).sub(center)
    const nb = new THREE.Vector3().crossVectors(tan, hint)
    if (nb.lengthSq() > 1e-6) b.copy(nb.normalize())
    n.crossVectors(b, tan).normalize()
    const k = profile(s)
    const tw = (o.twist ?? 0) * s
    for (let j = 0; j <= sides; j++) {
      // with ridges most of the ring is spent on the outer face
      const a = (ridges ? (j <= outer ? (j / outer) * Math.PI : Math.PI + ((j - outer) / (sides - outer)) * Math.PI) : (j / sides) * Math.PI * 2) + tw
      const cx = Math.cos(a) * o.w * 0.5 * k
      const sy = Math.sin(a)
      let cy = sy * thick * k * (sy >= 0 ? 1 : back)
      if (ridges && j < outer) cy *= 1 - groove * (1 - Math.sqrt(Math.abs(Math.sin((j / outer) * Math.PI * ridges))))
      pos.push(p.x + b.x * cx + n.x * cy, p.y + b.y * cx + n.y * cy, p.z + b.z * cx + n.z * cy)
      uv.push(j / sides, s)
    }
  }
  const row = sides + 1
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * row + j, c = a + row
      idx.push(a, a + 1, c, a + 1, c + 1, c)
    }
  }
  if (o.closed !== false) {
    for (const end of [0, seg]) {
      if (profile(end / seg) < 0.02) continue
      curve.getPoint(end / seg, p)
      const centerIndex = pos.length / 3
      pos.push(p.x, p.y, p.z)
      uv.push(0.5, end / seg)
      for (let j = 0; j < sides; j++) {
        const a = end * row + j
        if (end === 0) idx.push(centerIndex, a + 1, a)
        else idx.push(centerIndex, a, a + 1)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  // weld the seam so the lock shades as one surface
  const nrm = g.attributes.normal
  for (let i = 0; i <= seg; i++) {
    const a = i * row, c = a + sides
    const x = nrm.getX(a) + nrm.getX(c), y = nrm.getY(a) + nrm.getY(c), z = nrm.getZ(a) + nrm.getZ(c)
    const l = Math.hypot(x, y, z) || 1
    nrm.setXYZ(a, x / l, y / l, z / l)
    nrm.setXYZ(c, x / l, y / l, z / l)
  }
  return g
}

export const even = () => 1

/** Points round an ellipse in the XZ plane, for hems, cuffs and rims. */
export const ring = (r: number, y: number, squash = 1, n = 16) => Array.from({ length: n }, (_, i) => v(Math.sin((i / n) * Math.PI * 2) * r, y, Math.cos((i / n) * Math.PI * 2) * r * squash))

/** Knitted ribs running along a turned shape. */
export const ribs = (count: number, depth = 0.003) => (p: THREE.Vector3) => Math.sin(Math.atan2(p.x, p.z) * count) * depth

/** Pushes every vertex along its normal by `fn` — folds in cloth, dents, quilting. */
export function emboss<G extends THREE.BufferGeometry>(g: G, fn: (p: THREE.Vector3, n: THREE.Vector3) => number) {
  const pos = g.attributes.position, nrm = g.attributes.normal
  const p = new THREE.Vector3(), n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nrm, i)
    const d = fn(p, n)
    pos.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d)
  }
  // normals are averaged across duplicated seam vertices so the surface stays closed
  g.computeVertexNormals()
  const seen = new Map<string, number[]>()
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`
    const list = seen.get(key)
    if (list) list.push(i)
    else seen.set(key, [i])
  }
  for (const list of seen.values()) {
    if (list.length < 2) continue
    n.set(0, 0, 0)
    for (const i of list) n.add(p.fromBufferAttribute(nrm, i))
    n.normalize()
    for (const i of list) nrm.setXYZ(i, n.x, n.y, n.z)
  }
  return g
}

/** Soft cloth folds: a few drifting waves, strongest where `weight` says the fabric gathers. */
export function folds(amount: number, seed = 1, weight: (p: THREE.Vector3) => number = () => 1) {
  const r = rng(seed)
  const waves = Array.from({ length: 5 }, () => ({ f: 5 + r() * 9, y: (r() - 0.5) * 26, ph: r() * 6.28, a: 0.5 + r() * 0.5 }))
  return (p: THREE.Vector3) => {
    const ang = Math.atan2(p.x, p.z)
    let d = 0
    for (const w of waves) d += Math.sin(ang * Math.round(w.f) + p.y * w.y + w.ph) * w.a
    // creases are sharper than the swells between them
    const k = d / 2.2
    return amount * weight(p) * (k - 0.6 * Math.abs(k))
  }
}

/** A row of stitches along a path; all of them are baked into one mesh. */
export function stitches(parent: THREE.Object3D, points: THREE.Vector3[], material: THREE.Material, o: { count: number; len?: number; r?: number; closed?: boolean } ) {
  const curve = new THREE.CatmullRomCurve3(points, o.closed ?? false, 'centripetal')
  const count = Math.max(4, Math.round(o.count * Math.min(1, quality * 1.4)))
  const len = o.len ?? 0.016, r = o.r ?? 0.0035
  const base = capsule(r, len, 6, 2)
  const geos: THREE.BufferGeometry[] = []
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1)
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    q.setFromUnitVectors(up, curve.getTangentAt(t).normalize())
    geos.push(base.clone().applyMatrix4(m.compose(curve.getPointAt(t), q, one)))
  }
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  return mesh(parent, merged, material)
}

/** A parametric surface with optional thickness; `fn(u, v)` runs over 0…1 in both directions. */
export function sheet(fn: (u: number, v: number) => THREE.Vector3, nu0: number, nv0: number, thickness = 0) {
  const nu = res(nu0, 2), nv = res(nv0, 1)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const row = nu + 1
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const q = fn(i / nu, j / nv)
      pos.push(q.x, q.y, q.z)
      uv.push(i / nu, 1 - j / nv)
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * row + i, c = a + row
      idx.push(a, c, a + 1, a + 1, c, c + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  if (!thickness) return g
  const count = pos.length / 3
  const nrm = g.attributes.normal
  const pos2 = pos.slice(), uv2 = uv.slice(), idx2 = idx.slice()
  for (let i = 0; i < count; i++) {
    pos2.push(pos[i * 3] - nrm.getX(i) * thickness, pos[i * 3 + 1] - nrm.getY(i) * thickness, pos[i * 3 + 2] - nrm.getZ(i) * thickness)
    uv2.push(uv[i * 2], uv[i * 2 + 1])
  }
  for (let k = 0; k < idx.length; k += 3) idx2.push(idx[k] + count, idx[k + 2] + count, idx[k + 1] + count)
  const edge = (a: number, c: number) => idx2.push(a, c, a + count, c, c + count, a + count)
  for (let i = 0; i < nu; i++) {
    edge(i + 1, i)
    edge(nv * row + i, nv * row + i + 1)
  }
  for (let j = 0; j < nv; j++) {
    edge(j * row, (j + 1) * row)
    edge((j + 1) * row + nu, j * row + nu)
  }
  const solid = new THREE.BufferGeometry()
  solid.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3))
  solid.setAttribute('uv', new THREE.Float32BufferAttribute(uv2, 2))
  solid.setIndex(idx2)
  solid.computeVertexNormals()
  return solid
}

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Fine grain for cloth, leather and rubber so large surfaces do not read as plastic. */
export function grain(size = 128, strength = 28, seed = 7, weave = false) {
  const t = canvasTexture(size, size, (ctx, w, h) => {
    const r = rng(seed)
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = (r() - 0.5) * strength
        if (weave) n += ((x % 4 < 2 ? 1 : -1) * (y % 4 < 2 ? 1 : -1) * strength) / 3
        const c = 128 + n
        img.data.set([c, c, c, 255], (y * w + x) * 4)
      }
    }
    ctx.putImageData(img, 0, 0)
  })
  t.colorSpace = THREE.NoColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Bakes every loose mesh that shares a parent and material into one draw call. */
export function consolidate(root: THREE.Object3D) {
  const parents: THREE.Object3D[] = []
  root.traverse((o) => parents.push(o))
  for (const parent of parents) {
    const buckets = new Map<THREE.Material, THREE.Mesh[]>()
    for (const child of parent.children) {
      const m = child as THREE.Mesh
      if (!m.isMesh || m.children.length || m.userData.keep || Array.isArray(m.material) || !m.visible) continue
      const list = buckets.get(m.material) ?? []
      list.push(m)
      buckets.set(m.material, list)
    }
    for (const [material, list] of buckets) {
      if (list.length < 2) continue
      const geos = list.map((m) => {
        m.updateMatrix()
        let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
        g.applyMatrix4(m.matrix)
        if (m.matrix.determinant() < 0) {
          g = g.clone()
          for (const name of ['position', 'normal', 'uv']) {
            const a = g.attributes[name]
            const tmp = Array.from({ length: a.itemSize }, () => 0)
            for (let i = 0; i < a.count; i += 3) {
              for (let k = 0; k < a.itemSize; k++) tmp[k] = a.getComponent(i + 1, k)
              for (let k = 0; k < a.itemSize; k++) a.setComponent(i + 1, k, a.getComponent(i + 2, k))
              for (let k = 0; k < a.itemSize; k++) a.setComponent(i + 2, k, tmp[k])
            }
          }
        }
        m.geometry.dispose()
        return g
      })
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      list.forEach((m) => parent.remove(m))
      const out = new THREE.Mesh(merged, material)
      out.castShadow = true
      parent.add(out)
    }
  }
}
