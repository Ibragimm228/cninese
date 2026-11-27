import * as THREE from 'three'
import { FORE, buildRig, legGeo, swaying, torsoGeo } from '../body'
import type { Character } from '../chibi'
import { fall, hairline, lock, scalp } from '../hair'
import { capsule, cyl, even, grain, group, mat, mesh, rng, sheet, sphere, stitches, sweep, torus, turned, v } from '../kit'

export function ichigo(): Character {
  const robe = mat('#17171c', { rough: 0.78, coat: 0.04, sheen: 0.35, sheenColor: '#55557a', bump: grain(128, 30, 12, true), bumpScale: 0.9, side: THREE.DoubleSide })
  const rig = buildRig(
    { iris: ['#5a2c10', '#a85a22', '#f0b46a'], pupil: '#2a1206', lash: '#3a1f10', brow: '#c9651a', browWeight: 1.25, browArch: 0.02, browTilt: 0.2, browY: -0.02, mouth: 'frown', blush: 0.1, w: 0.58, h: 0.52, tilt: 0.12, flat: 0.45, lashWeight: 1 },
    { upper: robe, lower: robe, upperR: [0.13, 0.14], lowerR: [0.145, 0.19], folds: 0.012 },
  )
  const hairM = mat('#ff8a1f', { rough: 0.4, coat: 0.45, sheen: 0.5, sheenColor: '#ffe08a' })
  const hairDeep = mat('#e2670c', { rough: 0.5, coat: 0.3 })
  const white = mat('#f6f3ec', { rough: 0.75, bump: grain(128, 26, 13, true), bumpScale: 0.5 })
  const red = mat('#b3202a', { rough: 0.6, coat: 0.1 })
  const straw = mat('#d8b876', { rough: 0.85, bump: grain(128, 40, 14, true), bumpScale: 1.2 })
  const steel = mat('#e8edf5', { rough: 0.16, metal: 0.95, coat: 1 })
  const blackSteel = mat('#1c1d24', { rough: 0.3, metal: 0.8, coat: 0.6 })
  const wrap = mat('#efe9dc', { rough: 0.9, bump: grain(128, 40, 15, true), bumpScale: 1.4 })

  /* hair: dense crown of spikes */
  scalp(rig, hairDeep, hairline(0.72, -0.22, -0.7))
  const r = rng(21)
  for (let ring = 0; ring < 5; ring++) {
    const pitch = [1.25, 0.95, 0.62, 0.25, -0.15][ring]
    const count = [5, 9, 12, 13, 12][ring]
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + ring * 0.37 + (r() - 0.5) * 0.2
      const front = Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw))) < 1.1
      if (front && ring > 2) continue
      const len = 0.3 + r() * 0.16 - ring * 0.02
      const lean = (r() - 0.5) * 0.16
      lock(rig, r() > 0.3 ? hairM : hairDeep, [[yaw, pitch, 1.0], [yaw + lean * 0.5, pitch + 0.03, 1.08 + len * 0.5], [yaw + lean, pitch + 0.05, 1.08 + len]], { w: 0.34 - ring * 0.02, t: 0.15, seg: 10, sway: ring < 2 && i % 3 === 0 ? 0.3 : 0 })
    }
  }
  // jagged fringe
  for (let i = 0; i < 9; i++) {
    const yaw = -0.92 + i * 0.23
    fall(rig, hairM, yaw + (r() - 0.5) * 0.06, 0.4 - Math.abs(yaw) * 0.32 - (i % 2) * 0.12, { w: 0.25, t: 0.09, lift: 1.1, tip: 1.13, swoop: (i - 4) * -0.07, from: 1.1 })
  }
  for (const side of [1, -1]) {
    fall(rig, hairM, side * 1.12, -0.3, { w: 0.24, t: 0.08, lift: 1.1, tip: 1.14, from: 0.9 })
    fall(rig, hairM, side * 1.38, -0.42, { w: 0.24, t: 0.08, lift: 1.1, tip: 1.18, from: 0.8, sway: 0.4 })
  }
  for (let i = 0; i < 9; i++) {
    const yaw = 1.8 + (i / 8) * (Math.PI * 2 - 3.6)
    fall(rig, i % 2 ? hairM : hairDeep, yaw, -0.6 - (i % 2) * 0.12, { w: 0.34, t: 0.1, lift: 1.1, tip: 1.22, from: 0.6 })
  }

  /* shihakusho: white under-robe, black kosode crossed left over right */
  mesh(rig.chest, torsoGeo({ shoulder: 0.33, waist: 0.29, hip: 0.32 }), white, [0, 0, 0], [0, 0, 0], [1, 1, 0.78])
  mesh(rig.chest, torsoGeo({ shoulder: 0.385, waist: 0.325, hip: 0.35, bottom: 0.8 }), robe, [0, 0, -0.03], [0, 0, 0], [1, 1, 0.8])
  const collar = (m: THREE.Material, w: number, z: number, inset: number) => {
    mesh(rig.chest, sweep([v(0.17 - inset, 1.5, 0.1), v(0.15 - inset, 1.38, 0.24 + z), v(0.0, 1.14, 0.275 + z), v(-0.14, 0.96, 0.262 + z)], { w, t: 0.035, up: v(0, 0, 1), profile: even }), m)
    mesh(rig.chest, sweep([v(-0.17 + inset, 1.5, 0.1), v(-0.15 + inset, 1.38, 0.235 + z), v(-0.02, 1.16, 0.262 + z)], { w, t: 0.035, up: v(0, 0, 1), profile: even }), m)
    mesh(rig.chest, sweep([v(0.17 - inset, 1.5, 0.1), v(0.12, 1.53, -0.12), v(0, 1.54, -0.17), v(-0.12, 1.53, -0.12), v(-0.17 + inset, 1.5, 0.1)], { w, t: 0.035, up: v(0, 1, 0), profile: even }), m)
  }
  const thread = mat('#4a4a5c', { rough: 0.9, coat: 0 })
  stitches(rig.chest, [v(0.205, 1.4, 0.262), v(0.05, 1.15, 0.305), v(-0.1, 0.97, 0.292)], thread, { count: 30 })
  stitches(rig.chest, [v(-0.205, 1.4, 0.255), v(-0.07, 1.18, 0.29)], thread, { count: 18 })
  collar(robe, 0.1, 0.012, 0)
  collar(white, 0.05, 0.002, 0.07)
  // white sash, knotted at the hip
  mesh(rig.body, turned([[0.33, 0.99], [0.345, 0.96], [0.35, 0.86], [0.335, 0.83]], 36, 8), white, [0, 0, -0.01], [0, 0, 0], [1, 1, 0.82])
  const knot = group(rig.body, [0.2, 0.9, 0.24])
  mesh(knot, sphere(0.05, 12, 10), white, [0, 0, 0], [0, 0, 0], [1, 0.8, 0.7])
  for (const k of [-1, 1]) {
    const tail = mesh(knot, sweep([v(0, 0, 0), v(k * 0.03, -0.12, 0.03), v(k * 0.06, -0.26, 0.02)], { w: 0.07, t: 0.014, up: v(0, 0, 1), profile: even }), white)
    tail.userData.keep = true
    swaying(rig, tail, 0.8)
  }
  // red rosary strap across the chest that carries the sword
  mesh(rig.chest, sweep([v(-0.3, 1.47, 0.02), v(-0.2, 1.38, 0.25), v(0.05, 1.15, 0.305), v(0.3, 0.98, 0.2), v(0.34, 0.95, -0.05), v(0.2, 1.1, -0.3), v(-0.1, 1.35, -0.32), v(-0.3, 1.47, 0.02)], { w: 0.065, t: 0.025, center: v(0, 1.2, 0), profile: even, seg: 60 }), red)
  for (let i = 0; i < 12; i++) {
    const t = i / 11
    mesh(rig.chest, sphere(i % 3 === 1 ? 0.03 : 0.022, 12, 10), mat('#e24a52', { rough: 0.3, coat: 0.8 }), [-0.2 + t * 0.48, 1.38 - t * 0.4, 0.262 + Math.sin(t * Math.PI) * 0.06])
  }

  /* hakama: pleated, split at the front */
  const pleats = 14
  rig.legs.forEach((leg, li) => {
    const side = li ? -1 : 1
    mesh(leg, sheet((u, t) => {
      const a = u * Math.PI * 2
      const pleat = 1 + Math.cos(a * pleats / 2) * 0.035 * t
      const rad = (0.2 + t * 0.085) * pleat
      return v(Math.sin(a) * rad + side * 0.02 * t, 0.12 - t * 0.74, Math.cos(a) * rad * 0.95)
    }, 56, 10), robe)
    mesh(leg, legGeo(0.11, 0.1, 0.62), white)
    // tabi sock and straw waraji
    const foot = group(leg, [0, -0.62, 0], [0, side * 0.14, 0])
    mesh(foot, capsule(0.108, 0.17, 18, 8), white, [0, -0.07, 0.07], [Math.PI / 2, 0, 0], [1, 1, 0.7])
    mesh(foot, sweep([v(0.02 * side, -0.02, 0.2), v(0.02 * side, -0.08, 0.262)], { w: 0.01, t: 0.03, up: v(0, 0, 1), profile: even }), mat('#cfcabf'))
    mesh(foot, capsule(0.125, 0.2, 18, 8), straw, [0, -0.155, 0.08], [Math.PI / 2, 0, 0], [1, 1, 0.22])
    for (const k of [1, -1]) mesh(foot, sweep([v(0.02 * side, -0.01, 0.2), v(k * 0.08, 0.02, 0.1), v(k * 0.115, -0.12, 0.0)], { w: 0.03, t: 0.02, up: v(0, 1, 0), profile: even }), straw)
    mesh(foot, torus(0.1, 0.014), straw, [0, 0.03, -0.01], [Math.PI / 2, 0, 0])
  })

  // hakama ties in a flat bow under the sash
  for (const k of [1, -1]) {
    mesh(rig.body, sweep([v(0, 0.84, 0.292), v(k * 0.07, 0.87, 0.3), v(k * 0.12, 0.83, 0.285), v(k * 0.06, 0.81, 0.295), v(0, 0.84, 0.292)], { w: 0.035, t: 0.012, up: v(0, 0, 1), profile: even, center: v(k * 0.06, 0.84, 0.25) }), robe)
    mesh(rig.body, sweep([v(0, 0.84, 0.292), v(k * 0.03, 0.74, 0.3), v(k * 0.05, 0.66, 0.292)], { w: 0.035, t: 0.01, up: v(0, 0, 1), profile: even }), robe)
  }
  mesh(rig.body, sphere(0.028, 12, 10), robe, [0, 0.84, 0.297], [0, 0, 0], [1, 0.8, 0.7])
  for (const arm of rig.arms) {
    // wide sleeve opening with white lining
    mesh(arm.elbow, turned([[0.185, -FORE + 0.03], [0.192, -FORE + 0.0], [0.17, -FORE + 0.012], [0.1, -FORE + 0.06]], 24, 8), white)
    mesh(arm.elbow, capsule(0.075, 0.1), rig.skin, [0, -FORE + 0.06, 0])
  }

  /* Zangetsu: oversized cleaver slung across the back */
  const sword = group(rig.chest, [0.05, 1.22, -0.4], [0, 0, 0.62])
  const blade = new THREE.Shape()
  blade.moveTo(-0.13, -0.75)
  blade.lineTo(0.1, -0.75)
  blade.lineTo(0.13, 0.55)
  blade.quadraticCurveTo(0.12, 0.85, -0.13, 1.05)
  blade.lineTo(-0.13, -0.75)
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.03, bevelSegments: 2 })
  bladeGeo.translate(0, 0, -0.015)
  mesh(sword, bladeGeo, blackSteel)
  // polished cutting edge
  const edge = new THREE.Shape()
  edge.moveTo(0.06, -0.75)
  edge.lineTo(0.13, -0.75)
  edge.lineTo(0.16, 0.55)
  edge.quadraticCurveTo(0.15, 0.86, -0.13, 1.08)
  edge.quadraticCurveTo(0.07, 0.8, 0.08, 0.55)
  edge.lineTo(0.06, -0.75)
  const edgeGeo = new THREE.ExtrudeGeometry(edge, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 1 })
  edgeGeo.translate(0, 0, -0.006)
  mesh(sword, edgeGeo, steel)
  // fuller cut into the flat of the blade, with a line of forging marks beside it
  for (const z of [1, -1]) {
    mesh(sword, sweep([v(-0.06, -0.7, z * 0.028), v(-0.06, 0.4, z * 0.028), v(-0.07, 0.85, z * 0.028)], { w: 0.03, t: 0.004, up: v(0, 0, z), profile: (q) => Math.sin(Math.min(1, (1 - q) * 5) * Math.PI / 2), seg: 16, sides: 8 }), steel)
    for (let k = 0; k < 9; k++) mesh(sword, sphere(0.011, 8, 6), steel, [-0.105, -0.62 + k * 0.16, z * 0.027], [0, 0, 0], [1, 1, 0.35])
  }
  // collar where the blade meets the tang
  mesh(sword, cyl(0.07, 0.05, 0.05, 20), blackSteel, [-0.02, -0.765, 0], [0, 0, 0], [1.6, 1, 0.5])
  // cloth-wrapped tang
  mesh(sword, cyl(0.045, 0.04, 0.42, 12), wrap, [-0.02, -0.96, 0])
  for (let i = 0; i < 7; i++) mesh(sword, torus(0.047, 0.012), wrap, [-0.02, -0.8 - i * 0.055, 0], [Math.PI / 2 + 0.35, 0, 0])
  const ribbon = mesh(sword, sweep([v(-0.02, -1.17, 0), v(0.06, -1.3, 0.02), v(0.02, -1.5, 0.0), v(0.1, -1.68, 0.03)], { w: 0.06, t: 0.012, up: v(0, 0, 1), profile: even, seg: 20 }), wrap)
  ribbon.geometry.translate(0.02, 1.17, 0)
  ribbon.position.set(-0.02, -1.17, 0)
  ribbon.userData.keep = true
  swaying(rig, ribbon, 1.4)

  return {
    rig,
    rest: [
      { s: [0.0, 0, 0.3], e: 0.5, curl: 1 },
      { s: [0.0, 0, -0.3], e: 0.5, curl: 1 },
    ],
    waveArm: 0,
    cheerArms: [true, true],
  }
}
