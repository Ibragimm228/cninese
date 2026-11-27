import * as THREE from 'three'
import { headPoint, sp } from './face'
import { mesh, sweep, type SweepOpts } from './kit'
import { swaying, type Rig } from './body'

export type HairPoint = [yaw: number, pitch: number, r: number]

/** One sculpted lock running through points given around the head. `sway` makes it trail behind motion. */
export function lock(rig: Rig, material: THREE.Material, pts: HairPoint[], o: SweepOpts & { sway?: number }) {
  const points = pts.map(([yaw, pitch, r]) => sp(yaw, pitch, r))
  const geo = sweep(points, o)
  const m = mesh(rig.hair, geo, material)
  if (o.sway) {
    geo.translate(-points[0].x, -points[0].y, -points[0].z)
    m.position.copy(points[0])
    m.userData.keep = true
    swaying(rig, m, o.sway)
  }
  return m
}

export type FallOpts = Partial<SweepOpts> & {
  w: number
  /** where the lock leaves the crown */
  from?: number
  /** radius at the tip: above 1.05 flicks outwards */
  tip?: number
  /** how far the lock stands off the scalp mid-way */
  lift?: number
  /** sideways sweep of the root relative to the tip */
  swoop?: number
  fromYaw?: number
  sway?: number
}

/** A lock that falls from the crown to a point on the head — bangs, sides and the back are all made of these. */
export function fall(rig: Rig, material: THREE.Material, yaw: number, pitch: number, o: FallOpts) {
  const from = o.from ?? 1.32, lift = o.lift ?? 1.07, tip = o.tip ?? 1.03, swoop = o.swoop ?? 0
  const start = o.fromYaw ?? yaw + swoop
  const pts: HairPoint[] = [0, 0.28, 0.55, 0.8, 1].map((t) => {
    const ease = 1 - (1 - t) * (1 - t)
    return [
      start + (yaw - start) * ease,
      from + (pitch - from) * Math.pow(t, 0.85),
      t === 0 ? 1.02 : t === 1 ? tip : lift + (tip - lift) * Math.max(0, (t - 0.55) / 0.45) ** 1.5,
    ]
  })
  return lock(rig, material, pts, { ...o, w: o.w })
}

/** The shell of hair under the locks, following a hairline that can differ per character. */
export function scalp(rig: Rig, material: THREE.Material, hairline: (yaw: number) => number, lift = 0.035) {
  const nu = 72, nv = 26
  const pos: number[] = [], idx: number[] = [], uv: number[] = []
  const q = new THREE.Vector3()
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const yaw = (i / nu) * Math.PI * 2 - Math.PI
      const low = hairline(yaw)
      const pitch = low + (Math.PI / 2 - low) * (j / nv)
      headPoint(yaw, pitch, lift * Math.min(1, (j / nv) * 6 + 0.25), q)
      pos.push(q.x, q.y, q.z)
      uv.push(i / nu, j / nv)
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, c = a + nu + 1
      idx.push(a, a + 1, c, a + 1, c + 1, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return mesh(rig.hair, g, material)
}

/** A typical hairline: high over the forehead, dropping in front of the ears and down to the nape. */
export const hairline = (front = 0.62, side = -0.25, nape = -0.72) => (yaw: number) => {
  const a = Math.abs(yaw)
  if (a < 1.15) return front + (side - front) * Math.pow(a / 1.15, 2.2)
  if (a < 1.75) return side + 0.18 * Math.sin(((a - 1.15) / 0.6) * Math.PI)
  return side + (nape - side) * Math.min(1, (a - 1.75) / 0.9)
}
