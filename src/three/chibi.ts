import * as THREE from 'three'
import type { CompanionId } from '../data/companions'
import { poseArm, type ArmPose, type Rig } from './body'
import { consolidate } from './kit'
import { anya } from './cast/anya'
import { chrollo } from './cast/chrollo'
import { ichigo } from './cast/ichigo'
import { kuroko } from './cast/kuroko'

export type Chibi = {
  id: CompanionId
  root: THREE.Group
  update: (t: number, dt: number, turn?: number) => void
  wave: () => void
  celebrate: () => void
  look: (x: number, y: number) => void
}

export type Motion = { time: number; dt: number; wave: number; cheer: number; air: number }

export type Character = {
  rig: Rig
  rest: [ArmPose, ArmPose]
  /** which arm is free to wave: 0 is the character's left */
  waveArm: 0 | 1
  /** arms that go up when celebrating */
  cheerArms: [boolean, boolean]
  tick?: (m: Motion) => void
}

const builders: Record<CompanionId, () => Character> = { chrollo, kuroko, ichigo, anya }

const ease = (x: number) => x * x * (3 - 2 * x)
const mix = (a: number, b: number, k: number) => a + (b - a) * k

function blend(a: ArmPose, b: ArmPose, k: number): ArmPose {
  return {
    s: [mix(a.s[0], b.s[0], k), mix(a.s[1], b.s[1], k), mix(a.s[2], b.s[2], k)],
    e: mix(a.e, b.e, k),
    tw: mix(a.tw ?? 0, b.tw ?? 0, k),
    w: [mix(a.w?.[0] ?? 0, b.w?.[0] ?? 0, k), mix(a.w?.[1] ?? 0, b.w?.[1] ?? 0, k), mix(a.w?.[2] ?? 0, b.w?.[2] ?? 0, k)],
    curl: mix(a.curl ?? 0.3, b.curl ?? 0.3, k),
  }
}

const WAVE = 1.9
const CHEER = 2.6

export function createChibi(id: CompanionId, reducedMotion = false): Chibi {
  const character = builders[id]()
  const { rig } = character
  consolidate(rig.root)
  rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.receiveShadow = false })

  const phase = { chrollo: 0, kuroko: 1.3, ichigo: 2.6, anya: 3.9 }[id]
  let wave = 0
  let cheer = 0
  // with reduced motion a gesture is a held pose, not an animation
  let greet = false
  let nextBlink = 1.5 + phase
  let blink = 0
  let tilt = 0
  let tiltTarget = 0
  let nextFidget = 4 + phase
  let lastY = 0
  let headYaw = 0
  const target = new THREE.Vector2()
  const gaze = new THREE.Vector2()

  const update = (t: number, dt: number, turn = 0) => {
    const time = reducedMotion ? 0 : t + phase
    wave = Math.max(0, wave - dt)
    cheer = Math.max(0, cheer - dt)
    const wavePos = wave > 0 ? 1 - wave / WAVE : 0
    const cheerPos = cheer > 0 ? 1 - cheer / CHEER : 0
    const waveK = greet ? 1 : wave > 0 ? ease(Math.min(1, wavePos * 5)) * ease(Math.min(1, (1 - wavePos) * 4)) : 0
    const cheerK = cheer > 0 ? ease(Math.min(1, cheerPos * 6)) * ease(Math.min(1, (1 - cheerPos) * 4)) : 0

    // breathing and a gentle weight shift
    const breath = Math.sin(time * 1.7)
    rig.chest.position.y = breath * 0.012
    rig.chest.scale.set(1 + breath * 0.006, 1, 1 + breath * 0.012)
    rig.body.rotation.z = Math.sin(time * 0.85) * 0.018
    rig.chest.rotation.x = Math.sin(time * 0.6) * 0.012 - cheerK * 0.08

    // jumps: three bounces for a celebration, a little hop for a greeting
    const bounce = cheer > 0 ? Math.abs(Math.sin(cheerPos * Math.PI * 3)) * 0.42 * cheerK : wave > 0 ? Math.sin(Math.min(1, wavePos * 3.2) * Math.PI) * 0.14 : 0
    const crouch = cheer > 0 ? Math.max(0, 0.08 - bounce) * cheerK : 0
    rig.root.position.y = bounce
    rig.root.scale.set(1 + crouch * 0.6, 1 - crouch, 1 + crouch * 0.6)
    const vy = dt > 0 ? (bounce - lastY) / dt : 0
    lastY = bounce
    rig.legs.forEach((leg, i) => {
      leg.rotation.x = -Math.min(0.5, bounce * 1.3) * (i ? 1 : 0.6)
      leg.rotation.z = (i ? -1 : 1) * Math.min(0.2, bounce * 0.5)
    })

    // head: follow the pointer, tilt now and then
    gaze.lerp(target, Math.min(1, dt * 6))
    nextFidget -= dt
    if (nextFidget <= 0 && !reducedMotion) {
      tiltTarget = tiltTarget === 0 ? (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.08) : 0
      nextFidget = tiltTarget === 0 ? 4 + Math.random() * 5 : 1.4 + Math.random()
    }
    tilt += (tiltTarget - tilt) * Math.min(1, dt * 4)
    const yaw = gaze.x * 0.42
    const yawVel = dt > 0 ? (yaw - headYaw) / dt : 0
    headYaw = yaw
    rig.head.rotation.set(-gaze.y * 0.22 + Math.sin(time * 1.1) * 0.015 - cheerK * 0.12, yaw, tilt + Math.sin(time * 0.8) * 0.02 + waveK * 0.1 * (character.waveArm ? 1 : -1))
    rig.face.gaze(gaze.x * 0.75, gaze.y * 0.75)

    // face
    nextBlink -= dt
    if (nextBlink <= 0) { blink = 0.13; nextBlink = 2.2 + Math.random() * 3.4 }
    blink = Math.max(0, blink - dt)
    const happy = cheerK > 0.35 || (greet && reducedMotion)
    rig.face.eyes(happy ? 'happy' : blink > 0 && !reducedMotion ? 'closed' : 'open')
    rig.face.mouth(happy || waveK > 0.35 ? 'open' : 'rest')
    rig.face.brows(Math.max(cheerK, waveK * 0.7))

    // arms
    rig.arms.forEach((arm, i) => {
      const side = arm.side
      let pose = character.rest[i]
      const idle = Math.sin(time * 1.7 + i * 1.4) * 0.025
      if (i === character.waveArm && waveK > 0) {
        const wag = greet ? 0 : Math.sin(t * 11) * 0.38
        pose = blend(pose, { s: [0, 0, side * 2.25], e: 0.75 + wag, tw: 0, w: [0, 0, 0], curl: 0.02 }, waveK)
      }
      if (character.cheerArms[i] && cheerK > 0) {
        pose = blend(pose, { s: [-0.2, 0, side * (2.65 + Math.sin(t * 13 + i) * 0.1)], e: 0.3 + Math.sin(t * 13 + i * 2) * 0.12, tw: 0, w: [0, 0, 0], curl: 0.05 }, cheerK)
      }
      poseArm(arm, { ...pose, s: [pose.s[0], pose.s[1], pose.s[2] + side * idle] })
    })

    // hair, cloth and trinkets lag behind the body
    for (const s of rig.sway) {
      const tx = THREE.MathUtils.clamp(vy * 0.12, -0.5, 0.5) * s.gain + Math.sin(time * 1.6 + s.phase) * 0.028 * s.gain
      const tz = THREE.MathUtils.clamp(-(yawVel * 0.05 + turn * 4), -0.5, 0.5) * s.gain + Math.sin(time * 1.25 + s.phase * 1.3) * 0.022 * s.gain
      s.vx += ((tx - s.ax) * 60 - s.vx * 7) * dt
      s.vz += ((tz - s.az) * 60 - s.vz * 7) * dt
      s.ax += s.vx * dt
      s.az += s.vz * dt
      if (reducedMotion) { s.ax = 0; s.az = 0 }
      s.obj.rotation.set(s.rest.x + s.ax, s.rest.y, s.rest.z + s.az)
    }

    character.tick?.({ time, dt: reducedMotion ? 0 : dt, wave: waveK, cheer: cheerK, air: bounce })
  }

  return {
    id,
    root: rig.root,
    wave: () => { if (reducedMotion) greet = !greet; else if (cheer <= 0) wave = WAVE },
    celebrate: () => { if (reducedMotion) greet = true; else { cheer = CHEER; wave = 0 } },
    look: (x, y) => target.set(x, y),
    update,
  }
}
