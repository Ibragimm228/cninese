import * as THREE from 'three'
import { SKIN, capsule, group, mat, mesh, sphere, sweep, turned, v, type V3 } from './kit'
import { buildHead, paintFace, type Face, type FaceStyle } from './face'

export type Arm = {
  side: 1 | -1
  shoulder: THREE.Group
  elbow: THREE.Group
  hand: THREE.Group
  fingers: THREE.Group[]
  thumb: THREE.Group
}

export type ArmPose = {
  /** shoulder rotation: x swings forward (negative) or back, z lifts sideways, y twists */
  s: V3
  /** elbow bend, 0 straight */
  e: number
  /** forearm twist */
  tw?: number
  /** wrist rotation */
  w?: V3
  /** finger curl 0 open … 1 fist */
  curl?: number
}

/** Something that trails behind the motion: hair, cloth tails, earrings. */
export type Sway = { obj: THREE.Object3D; rest: THREE.Euler; gain: number; ax: number; az: number; vx: number; vz: number; phase: number }

export type Rig = {
  root: THREE.Group
  body: THREE.Group
  chest: THREE.Group
  head: THREE.Group
  hair: THREE.Group
  face: Face
  arms: [Arm, Arm]
  legs: [THREE.Group, THREE.Group]
  sway: Sway[]
  skin: THREE.Material
}

export const HIP_Y = 0.8
export const SHOULDER_Y = 1.37
export const HEAD_Y = 2.34
export const HEAD_SCALE = 0.9
export const UPPER = 0.3
export const FORE = 0.27

export function swaying(rig: Rig, obj: THREE.Object3D, gain = 1) {
  rig.sway.push({ obj, rest: obj.rotation.clone(), gain, ax: 0, az: 0, vx: 0, vz: 0, phase: rig.sway.length * 1.7 })
  return obj
}

function buildHand(arm: THREE.Group, side: 1 | -1, skin: THREE.Material) {
  const hand = group(arm, [0, -FORE, 0])
  // the palm faces the body while the arm hangs
  mesh(hand, sphere(0.1, 20, 16), skin, [0, -0.085, 0], [0, 0, 0], [0.56, 1.02, 0.9])
  const fingers: THREE.Group[] = []
  const lengths = [0.058, 0.066, 0.062, 0.05]
  lengths.forEach((len, i) => {
    const z = 0.062 - i * 0.041
    const knuckle = group(hand, [-side * 0.004, -0.165 + Math.abs(i - 1.3) * -0.006 + 0.008, z])
    mesh(knuckle, capsule(0.0235, len, 10), skin, [0, -len / 2, 0])
    const tip = group(knuckle, [0, -len - 0.008, 0])
    mesh(tip, capsule(0.0215, len * 0.72, 10), skin, [0, -len * 0.36, 0])
    tip.userData.tip = true
    knuckle.userData.tipGroup = tip
    fingers.push(knuckle)
  })
  const thumb = group(hand, [-side * 0.02, -0.07, 0.085], [0.75, 0, -side * 0.35])
  mesh(thumb, capsule(0.027, 0.055, 10), skin, [0, -0.035, 0])
  const thumbTip = group(thumb, [0, -0.075, 0], [0, 0, -side * 0.3])
  mesh(thumbTip, capsule(0.024, 0.04, 10), skin, [0, -0.02, 0])
  thumb.userData.tipGroup = thumbTip
  return { hand, fingers, thumb }
}

export function curl(arm: Arm, amount: number, only?: number[]) {
  arm.fingers.forEach((f, i) => {
    const a = only && !only.includes(i) ? 0.06 : amount
    f.rotation.z = -arm.side * a * 1.35
    ;(f.userData.tipGroup as THREE.Group).rotation.z = -arm.side * a * 1.5
  })
  if (!only) arm.thumb.rotation.z = -arm.side * (0.35 + amount * 0.7)
}

export type ArmStyle = {
  upper: THREE.Material
  lower: THREE.Material
  upperR?: [number, number]
  lowerR?: [number, number]
  /** how far down the forearm the sleeve reaches; the rest is bare */
  sleeve?: number
}

function buildArm(chest: THREE.Object3D, side: 1 | -1, skin: THREE.Material, st: ArmStyle): Arm {
  const shoulder = group(chest, [side * 0.37, SHOULDER_Y, 0])
  const [u0, u1] = st.upperR ?? [0.115, 0.1]
  const [l0, l1] = st.lowerR ?? [0.098, 0.082]
  mesh(shoulder, sphere(u0 * 1.08, 20, 16), st.upper)
  mesh(shoulder, turned([[0, 0.01], [u0, 0], [u0, -0.02], [(u0 + u1) / 2, -UPPER * 0.6], [u1, -UPPER], [0, -UPPER - 0.01]], 20, 14), st.upper)
  const elbow = group(shoulder, [0, -UPPER, 0])
  mesh(elbow, sphere(Math.max(u1, l0) * 1.02, 18, 14), st.lower)
  mesh(elbow, turned([[0, 0.01], [l0, 0], [l0, -0.03], [(l0 + l1) / 2, -FORE * 0.6], [l1, -FORE + 0.01], [l1 * 0.7, -FORE - 0.01], [0, -FORE - 0.012]], 20, 14), st.lower)
  const { hand, fingers, thumb } = buildHand(elbow, side, skin)
  const arm: Arm = { side, shoulder, elbow, hand, fingers, thumb }
  curl(arm, 0.3)
  return arm
}

export function poseArm(arm: Arm, p: ArmPose) {
  arm.shoulder.rotation.set(p.s[0], p.s[1], p.s[2])
  arm.elbow.rotation.set(-p.e, p.tw ?? 0, 0)
  if (p.w) arm.hand.rotation.set(...p.w)
  else arm.hand.rotation.set(0, 0, 0)
  curl(arm, p.curl ?? 0.3)
}

export function buildRig(faceStyle: FaceStyle, arms: ArmStyle | [ArmStyle, ArmStyle]): Rig {
  const root = new THREE.Group()
  const body = group(root)
  const chest = group(body)
  const { head, skin } = buildHead()
  head.position.set(0, HEAD_Y, 0.02)
  head.scale.setScalar(HEAD_SCALE)
  chest.add(head)
  const face = paintFace(head, faceStyle)
  const hair = group(head)
  mesh(chest, capsule(0.105, 0.16), skin, [0, 1.5, 0])
  const [left, right] = Array.isArray(arms) ? arms : [arms, arms]
  const legs: [THREE.Group, THREE.Group] = [group(body, [0.165, HIP_Y, 0]), group(body, [-0.165, HIP_Y, 0])]
  return {
    root, body, chest, head, hair, face, skin,
    arms: [buildArm(chest, 1, skin, left), buildArm(chest, -1, skin, right)],
    legs,
    sway: [],
  }
}

/** A chibi torso: narrow shoulders, a soft waist. Returned unscaled so callers can flatten it. */
export function torsoGeo(o: { shoulder?: number; waist?: number; hip?: number; top?: number; bottom?: number } = {}) {
  const sh = o.shoulder ?? 0.36, w = o.waist ?? 0.29, h = o.hip ?? 0.33, top = o.top ?? 1.47, bottom = o.bottom ?? 0.74
  return turned([[0, top + 0.02], [0.11, top + 0.01], [sh * 0.8, top - 0.05], [sh, top - 0.15], [sh * 0.96, 1.2], [w, 1.02], [w * 1.02, 0.94], [h, bottom + 0.08], [h * 0.9, bottom], [0, bottom - 0.02]], 36, 30)
}

export function legGeo(top: number, bottom: number, len: number, bulge = 1) {
  return turned([[0, 0.02], [top, 0], [top * bulge, -len * 0.3], [(top + bottom) / 2, -len * 0.7], [bottom, -len], [0, -len - 0.01]], 22, 16)
}

export type ShoeStyle = {
  upper: THREE.Material
  sole: THREE.Material
  toe?: THREE.Material
  lace?: THREE.Material
  tongue?: THREE.Material
  stripe?: THREE.Material
  /** ankle collar height */
  high?: number
  size?: number
  heel?: number
}

/** Builds a shoe around the ankle at the bottom of a leg group; `y` is the ankle height above the sole. */
export function shoe(leg: THREE.Object3D, side: number, legLen: number, st: ShoeStyle) {
  const s = st.size ?? 1
  const foot = group(leg, [0, -legLen, 0], [0, side * 0.14, 0])
  foot.scale.setScalar(s)
  const ground = -(HIP_Y - legLen) / s
  const body = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 10, 22)
  // sole: two layers so the edge reads as a welt
  mesh(foot, body(0.128, 0.2), st.sole, [0, ground + 0.03, 0.085], [Math.PI / 2, 0, 0], [1.02, 1, 0.3])
  if (st.heel) mesh(foot, body(0.122, 0.02), st.sole, [0, ground + 0.03 + st.heel / 2, -0.03], [Math.PI / 2, 0, 0], [1, 1, 0.3 + st.heel * 4])
  mesh(foot, body(0.118, 0.19), st.upper, [0, ground + 0.115, 0.08], [Math.PI / 2, 0, 0], [1, 1, 0.82])
  if (st.toe) mesh(foot, sphere(0.119, 22, 16), st.toe, [0, ground + 0.1, 0.19], [0, 0, 0], [1, 0.72, 0.86])
  const high = st.high ?? 0.08
  mesh(foot, turned([[0.105, ground + 0.12], [0.108, ground + 0.18], [0.112, ground + 0.2 + high], [0.118, ground + 0.215 + high], [0.1, ground + 0.22 + high]], 22, 10), st.upper, [0, 0, -0.005])
  if (st.tongue) mesh(foot, sphere(0.075, 16, 12), st.tongue, [0, ground + 0.2 + high * 0.6, 0.075], [-0.5, 0, 0], [0.8, 1.15, 0.4])
  if (st.lace) {
    for (let i = 0; i < 4; i++) {
      const z = 0.2 - i * 0.042, y = ground + 0.168 + i * 0.022
      mesh(foot, capsule(0.011, 0.085, 6), st.lace, [0, y, z], [0, 0, Math.PI / 2 + (i % 2 ? 0.22 : -0.22)])
    }
    for (const k of [1, -1]) mesh(foot, sweep([v(0, ground + 0.24, 0.1), v(k * 0.05, ground + 0.27, 0.13), v(k * 0.085, ground + 0.22, 0.14), v(k * 0.03, ground + 0.235, 0.105)], { w: 0.02, t: 0.01, profile: () => 1, up: v(0, 0, 1), sides: 6 }), st.lace)
  }
  if (st.stripe) {
    for (const k of [1, -1]) mesh(foot, sweep([v(k * 0.119, ground + 0.07, 0.19), v(k * 0.124, ground + 0.12, 0.1), v(k * 0.122, ground + 0.19, 0.0)], { w: 0.045, t: 0.012, profile: (q) => 0.5 + q * 0.6, up: v(k, 0, 0), sides: 6 }), st.stripe)
  }
  return foot
}

/** A band of tufts around a ring — collars and cuffs of fur. */
export function furRing(parent: THREE.Object3D, material: THREE.Material, o: { r: number; y?: number; count: number; len: number; w: number; rows?: number; squash?: number; arc?: [number, number]; seed?: number; droop?: number }) {
  const rows = o.rows ?? 2
  const [a0, a1] = o.arc ?? [0, Math.PI * 2]
  let k = o.seed ?? 1
  const rand = () => {
    k = (k * 16807) % 2147483647
    return k / 2147483647
  }
  const g = group(parent, [0, o.y ?? 0, 0])
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < o.count; i++) {
      const a = a0 + ((i + (row % 2) * 0.5 + (rand() - 0.5) * 0.4) / o.count) * (a1 - a0)
      const dir = v(Math.sin(a), 0, Math.cos(a) * (o.squash ?? 1))
      const lift = (row - (rows - 1) / 2) * o.w * 0.8
      const base = dir.clone().multiplyScalar(o.r * 0.9).add(v(0, lift, 0))
      const len = o.len * (0.75 + rand() * 0.5)
      const out = dir.clone().multiplyScalar(len * 0.75)
      const tip = base.clone().add(out).add(v((rand() - 0.5) * len * 0.5, lift * 1.4 - len * (o.droop ?? 0.25) + (rand() - 0.5) * len * 0.4, (rand() - 0.5) * len * 0.5))
      const mid = base.clone().lerp(tip, 0.5).add(v(0, len * 0.14, 0))
      mesh(g, sweep([base, mid, tip], { w: o.w * (0.8 + rand() * 0.5), t: o.w * 0.42, back: 1, seg: 5, sides: 6, up: v(0, 1, 0), profile: (s) => Math.sqrt(Math.max(0, 1 - s * s)) }), material)
    }
  }
  return g
}

export { SKIN, mat }
