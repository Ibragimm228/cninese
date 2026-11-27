import * as THREE from 'three'
import { FORE, buildRig, legGeo, shoe, swaying, torsoGeo } from '../body'
import type { Character } from '../chibi'
import { sp } from '../face'
import { fall, hairline, lock, scalp } from '../hair'
import { capsule, cyl, even, grain, group, mat, mesh, rng, sheet, sphere, sweep, torus, turned, v } from '../kit'

export function anya(): Character {
  const dress = mat('#1b1b22', { rough: 0.7, coat: 0.08, sheen: 0.4, sheenColor: '#565a80', bump: grain(128, 26, 31, true), bumpScale: 0.6, side: THREE.DoubleSide })
  const rig = buildRig(
    { iris: ['#1f7a52', '#48c486', '#c9f7d6'], pupil: '#0e3f2b', lash: '#4a2a36', brow: '#e58fa8', browWeight: 0.75, browArch: 0.3, browTilt: -0.08, mouth: 'smug', blush: 0.55, blushLines: true, w: 0.66, h: 0.74, tilt: 0.03, flat: 0.05, lashWeight: 1.1 },
    { upper: dress, lower: dress, upperR: [0.11, 0.1], lowerR: [0.098, 0.092] },
  )
  const hairM = mat('#f7a3bd', { rough: 0.4, coat: 0.5, sheen: 0.6, sheenColor: '#fff0f5' })
  const hairDeep = mat('#e8839f', { rough: 0.5, coat: 0.3 })
  const white = mat('#fbfaf6', { rough: 0.7, bump: grain(128, 26, 32, true), bumpScale: 0.4 })
  const gold = mat('#e9bf52', { rough: 0.22, metal: 0.9, coat: 0.6 })
  const black = mat('#141418', { rough: 0.28, coat: 0.85 })
  const shell = mat('#d9a25c', { rough: 0.7, bump: grain(128, 60, 33, true), bumpScale: 1.6 })

  /* hair: shoulder-length bob curling inwards */
  scalp(rig, hairDeep, hairline(0.72, -0.3, -0.85))
  const r = rng(41)
  for (let i = 0; i < 9; i++) {
    const yaw = -0.72 + i * 0.18
    fall(rig, hairM, yaw + (r() - 0.5) * 0.04, 0.36 - Math.abs(yaw) * 0.12 + (i % 2) * 0.05, { w: 0.3, t: 0.075, lift: 1.085, tip: 1.045, swoop: yaw * -0.25, from: 1.25 })
  }
  for (const side of [1, -1]) {
    // long side strands frame the face
    fall(rig, hairM, side * 0.95, -0.72, { w: 0.3, t: 0.08, lift: 1.1, tip: 1.02, from: 1.2, swoop: -side * 0.12, sway: 0.7 })
    fall(rig, hairM, side * 1.18, -0.95, { w: 0.34, t: 0.09, lift: 1.12, tip: 1.0, from: 1.2, sway: 0.6 })
    fall(rig, hairM, side * 1.45, -1.0, { w: 0.38, t: 0.09, lift: 1.13, tip: 1.0, from: 1.2 })
  }
  for (let i = 0; i < 14; i++) {
    const yaw = 1.7 + (i / 13) * (Math.PI * 2 - 3.4)
    fall(rig, i % 3 ? hairM : hairDeep, yaw, -1.0 - (i % 2) * 0.06, { w: 0.42, t: 0.1, lift: 1.14, tip: 1.0, from: 1.3, swoop: (r() - 0.5) * 0.15, sway: i % 4 === 0 ? 0.4 : 0 })
  }
  for (let i = 0; i < 10; i++) {
    const yaw = (i / 10) * Math.PI * 2 + 0.3
    fall(rig, hairM, yaw, 0.55, { w: 0.5, t: 0.09, lift: 1.11, tip: 1.12, from: 1.45, swoop: 0.3 })
  }
  // ahoge
  lock(rig, hairM, [[0.1, 1.5, 1.04], [0.4, 1.4, 1.26], [-0.3, 1.45, 1.36], [-0.9, 1.2, 1.3]], { w: 0.07, t: 0.04, sway: 1.4, seg: 18 })
  // horn-like hair ornaments with gold caps
  for (const side of [1, -1]) {
    const horn = group(rig.head)
    horn.position.copy(sp(side * 0.95, 0.98, 1.13))
    horn.lookAt(sp(side * 0.95, 0.98, 3))
    horn.rotateX(Math.PI / 2)
    horn.scale.setScalar(1.7)
    mesh(horn, turned([[0, -0.03], [0.1, -0.02], [0.105, 0.03], [0.07, 0.14], [0.02, 0.22], [0, 0.225]], 20, 12), black)
    mesh(horn, torus(0.104, 0.02, 8, 22), gold, [0, 0.0, 0], [Math.PI / 2, 0, 0])
    mesh(horn, sphere(0.028, 10, 8), gold, [0, 0.225, 0])
  }

  /* dress with white collar, gold trim and a flared, pleated skirt */
  mesh(rig.chest, torsoGeo({ shoulder: 0.33, waist: 0.275, hip: 0.3, bottom: 0.86 }), dress, [0, 0, 0], [0, 0, 0], [1, 1, 0.8])
  const skirt = mesh(rig.body, sheet((u, t) => {
    const a = u * Math.PI * 2
    const fold = 1 + Math.cos(a * 9) * 0.05 * t
    const rad = (0.285 + Math.pow(t, 0.8) * 0.3) * fold
    return v(Math.sin(a) * rad, -t * 0.43 + Math.cos(a * 9) * 0.012 * t, Math.cos(a) * rad * 0.88)
  }, 90, 10), dress, [0, 0.98, 0])
  skirt.userData.keep = true
  swaying(rig, skirt, 0.12)
  mesh(skirt, sheet((u, t) => {
    const a = u * Math.PI * 2
    const rad = (0.585 + t * 0.012) * (1 + Math.cos(a * 9) * 0.05)
    return v(Math.sin(a) * rad, -0.425 - t * 0.03 + Math.cos(a * 9) * 0.012, Math.cos(a) * rad * 0.88)
  }, 90, 1), gold).userData.keep = true
  // petticoat
  mesh(skirt, sheet((u, t) => {
    const a = u * Math.PI * 2
    const rad = (0.26 + t * 0.29) * (1 + Math.cos(a * 18) * 0.025 * t)
    return v(Math.sin(a) * rad, -0.05 - t * 0.4, Math.cos(a) * rad * 0.88)
  }, 72, 4), mat('#fbfaf6', { rough: 0.8, side: THREE.DoubleSide })).userData.keep = true
  mesh(rig.body, torus(0.282, 0.02, 8, 36), gold, [0, 0.985, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1])
  // front placket with gold buttons
  mesh(rig.chest, sweep([v(0, 1.42, 0.2), v(0, 1.25, 0.272), v(0, 1.0, 0.228)], { w: 0.03, t: 0.012, up: v(0, 0, 1), profile: even }), gold)
  for (const y of [1.3, 1.18, 1.06]) mesh(rig.chest, sphere(0.024, 10, 8), gold, [0, y, y > 1.2 ? 0.278 : y > 1.1 ? 0.262 : 0.24])
  // round white collar in two leaves with a ribbon
  for (const side of [1, -1]) {
    mesh(rig.chest, sweep([v(side * 0.015, 1.44, 0.2), v(side * 0.13, 1.4, 0.2), v(side * 0.21, 1.47, 0.06), v(side * 0.15, 1.52, -0.1), v(0, 1.53, -0.15)], { w: 0.11, t: 0.03, up: v(0, 1, 0.5), profile: (s) => 0.6 + Math.sin(Math.min(1, s * 2) * Math.PI / 2) * 0.4 }), white)
    mesh(rig.chest, sweep([v(0, 1.4, 0.24), v(side * 0.07, 1.42, 0.25), v(side * 0.1, 1.37, 0.262), v(0, 1.4, 0.24)], { w: 0.05, t: 0.02, up: v(0, 0, 1), profile: even, center: v(side * 0.05, 1.4, 0.25) }), gold)
  }
  mesh(rig.chest, sphere(0.026, 10, 8), gold, [0, 1.4, 0.25])

  for (const arm of rig.arms) {
    // puffed shoulder, gold-edged white cuff
    mesh(arm.shoulder, sphere(0.14, 18, 14), dress, [0, -0.06, 0], [0, 0, 0], [1, 0.9, 1])
    mesh(arm.elbow, turned([[0.09, -FORE + 0.09], [0.106, -FORE + 0.075], [0.11, -FORE + 0.02], [0.095, -FORE + 0.008]], 20, 8), white)
    mesh(arm.elbow, torus(0.106, 0.01, 6, 20), gold, [0, -FORE + 0.08, 0], [Math.PI / 2, 0, 0])
  }

  rig.legs.forEach((leg, i) => {
    const side = i ? -1 : 1
    mesh(leg, legGeo(0.12, 0.095, 0.62, 1.02), white)
    // sock cuff and mary janes with a strap and gold buckle
    mesh(leg, turned([[0.1, -0.43], [0.112, -0.44], [0.112, -0.5], [0.1, -0.51]], 20, 6), white)
    shoe(leg, side, 0.62, { upper: black, sole: black, toe: black, high: 0.0, size: 1.08, heel: 0.03 })
    mesh(leg, torus(0.112, 0.016, 6, 20), black, [0, -0.6, 0.01], [Math.PI / 2 - 0.2, 0, 0])
    mesh(leg, sphere(0.02, 8, 8), gold, [side * 0.112, -0.6, 0.01])
  })

  /* a peanut held up proudly, with sparkles */
  const nut = group(rig.arms[1].hand, [0.02, -0.26, 0.0], [0.2, 0, 0.3])
  mesh(nut, sphere(0.085, 18, 14), shell, [0, 0.07, 0], [0, 0, 0], [1, 1.08, 1])
  mesh(nut, sphere(0.092, 18, 14), shell, [0, -0.07, 0], [0, 0, 0], [1, 1.08, 1])
  mesh(nut, cyl(0.065, 0.065, 0.08, 14), shell)
  const sparkM = mat('#fff3b0', { emissive: '#ffd23f', glow: 2.5, rough: 0.3 })
  const sparks = [0, 1, 2].map((k) => {
    const s = group(nut, [Math.cos(k * 2.1) * 0.2, 0.12 + k * 0.05, Math.sin(k * 2.1) * 0.1])
    const geo = new THREE.OctahedronGeometry(0.035)
    geo.scale(0.35, 1, 0.35)
    mesh(s, geo, sparkM).userData.keep = true
    mesh(s, geo, sparkM, [0, 0, 0], [0, 0, Math.PI / 2]).userData.keep = true
    return s
  })
  void capsule

  return {
    rig,
    rest: [
      { s: [0.1, 0, 0.22], e: 0.2, curl: 0.4 },
      { s: [-0.5, 0, -0.75], e: 1.9, tw: 0.2, curl: 0.95 },
    ],
    waveArm: 0,
    cheerArms: [true, false],
    tick: ({ time }) => {
      sparks.forEach((s, k) => {
        const p = (Math.sin(time * 2.6 + k * 2.1) + 1) / 2
        s.scale.setScalar(0.3 + p * 1.1)
        s.rotation.z = time * 1.2 + k
      })
    },
  }
}
