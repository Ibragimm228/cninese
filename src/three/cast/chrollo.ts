import * as THREE from 'three'
import { FORE, UPPER, buildRig, furRing, legGeo, shoe, swaying, torsoGeo } from '../body'
import type { Character } from '../chibi'
import { sp } from '../face'
import { hairline, lock, scalp } from '../hair'
import { box, canvasTexture, cyl, even, grain, group, mat, mesh, ring, rng, sheet, sphere, stitches, sweep, torus, v } from '../kit'

function coverTexture() {
  return canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#7a1420'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#e2b95a'
    ctx.lineWidth = 6
    ctx.strokeRect(16, 16, w - 32, h - 32)
    ctx.lineWidth = 2
    ctx.strokeRect(28, 28, w - 56, h - 56)
    // a hand print, the mark of the stolen skills
    ctx.fillStyle = '#e2b95a'
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.58, 34, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 5; i++) {
      const a = -1.05 + i * 0.5
      ctx.save()
      ctx.translate(w / 2 + Math.sin(a) * 34, h * 0.58 - Math.cos(a) * 38)
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(0, -22, 8, i === 0 || i === 4 ? 20 : 28, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#7a1420'
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.58, 12, 0, Math.PI * 2)
    ctx.fill()
  })
}

export function chrollo(): Character {
  const coatM = mat('#1d1b2b', { rough: 0.5, coat: 0.35, sheen: 0.5, sheenColor: '#6a62a8', bump: grain(128, 26, 7, true), bumpScale: 0.7 })
  const lining = mat('#3b2a5c', { rough: 0.6, side: THREE.DoubleSide })
  const rig = buildRig(
    { iris: ['#15131c', '#3a3550', '#8d86b8'], pupil: '#050408', lash: '#101014', brow: '#17161d', browWeight: 0.9, browArch: 0.1, browTilt: 0.05, mouth: 'smirk', blush: 0.12, w: 0.6, h: 0.56, tilt: 0.08, flat: 0.35, lashWeight: 1 },
    { upper: coatM, lower: coatM, upperR: [0.125, 0.12], lowerR: [0.118, 0.125], folds: 0.009 },
  )
  const hairM = mat('#16151c', { rough: 0.3, coat: 0.8, sheen: 0.6, sheenColor: '#7f8cff' })
  const fur = mat('#f6f1e7', { rough: 0.95, coat: 0, sheen: 0.8, sheenColor: '#ffffff' })
  const white = mat('#f3f1ee', { rough: 0.7 })
  const dark = mat('#121118', { rough: 0.55, coat: 0.2 })
  const leather = mat('#0d0d12', { rough: 0.3, coat: 0.7 })
  const gold = mat('#e2b95a', { rough: 0.25, metal: 0.9 })
  const thread = mat('#5d5878', { rough: 0.9, coat: 0 })
  const ink = mat('#2a2f7c', { rough: 0.6 })

  /* hair: combed straight back in separate glossy strands */
  scalp(rig, hairM, hairline(0.8, -0.2, -0.72))
  const r = rng(5)
  for (let i = 0; i < 15; i++) {
    const yaw = -1.05 + i * 0.15
    const back = Math.PI - yaw * 0.75
    const top = 0.78 - Math.abs(yaw) * 0.42
    lock(rig, hairM, [[yaw, top, 1.03], [yaw * 0.95, top + 0.3, 1.12 + r() * 0.02], [yaw * 0.6, 1.45, 1.13], [back, 1.05, 1.12], [back, 0.3, 1.1], [back, -0.5 - r() * 0.2, 1.07]], { w: 0.26, t: 0.032, seg: 30 })
  }
  for (const side of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const p = 0.25 - i * 0.16
      lock(rig, hairM, [[side * 1.12, p, 1.035], [side * 1.6, p + 0.05, 1.07], [side * 2.2, p - 0.2, 1.085], [side * 2.75, p - 0.55, 1.07]], { w: 0.3, t: 0.03, seg: 22 })
    }
    // one strand escapes over the temple
    lock(rig, hairM, [[side * 0.85, 0.62, 1.04], [side * 0.98, 0.42, 1.1], [side * 1.02, 0.1, 1.08], [side * 0.97, -0.12, 1.06]], { w: 0.07, t: 0.03, sway: 0.5 })
    // orb earring on a short chain
    const ear = group(rig.head)
    ear.position.copy(sp(side * 1.5, -0.42, 0.98))
    mesh(ear, cyl(0.008, 0.008, 0.07, 6), gold, [0, -0.035, 0])
    mesh(ear, sphere(0.062, 20, 14), mat('#3fd6d0', { rough: 0.1, coat: 1, emissive: '#1c8f8a', glow: 0.5 }), [0, -0.12, 0])
    mesh(ear, torus(0.03, 0.008), gold, [0, -0.06, 0], [Math.PI / 2, 0, 0])
    ear.userData.keep = true
    swaying(rig, ear, 1.2)
  }
  // cross tattoo on the forehead
  const cross = group(rig.head)
  cross.position.copy(sp(0, 0.56, 1.004))
  cross.lookAt(sp(0, 0.56, 3))
  mesh(cross, new THREE.BoxGeometry(0.045, 0.2, 0.006), ink)
  mesh(cross, new THREE.BoxGeometry(0.14, 0.045, 0.006), ink, [0, 0.03, 0])

  /* torso: bare-chested look is replaced with a dark shirt under the open coat */
  mesh(rig.chest, torsoGeo({ shoulder: 0.33, waist: 0.28, hip: 0.31 }), dark, [0, 0, 0], [0, 0, 0], [1, 1, 0.78])
  mesh(rig.chest, torsoGeo({ shoulder: 0.385, waist: 0.33, hip: 0.37, bottom: 0.8 }), coatM, [0, 0, -0.035], [0, 0, 0], [1, 1, 0.82])
  // lapels fold open from the collar to the waist
  for (const side of [1, -1]) {
    mesh(rig.chest, sweep([v(side * 0.1, 1.46, 0.2), v(side * 0.16, 1.25, 0.285), v(side * 0.1, 1.02, 0.275), v(side * 0.05, 0.86, 0.29)], { w: 0.17, t: 0.03, up: v(side * 0.3, 0, 1), profile: (s) => 0.55 + Math.sin(s * Math.PI) * 0.45 }), coatM)
    mesh(rig.chest, sweep([v(side * 0.05, 1.44, 0.21), v(side * 0.09, 1.25, 0.285), v(side * 0.03, 1.02, 0.262)], { w: 0.05, t: 0.012, up: v(0, 0, 1), profile: even }), lining)
  }
  // belt with a buckle
  mesh(rig.body, torus(0.325, 0.03), leather, [0, 0.9, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1])
  mesh(rig.body, box(0.1, 0.075, 0.03), gold, [0, 0.9, 0.262])
  mesh(rig.body, box(0.06, 0.04, 0.035), leather, [0, 0.9, 0.262])
  // belt loops, punched holes and a pointed strap end
  for (const a of [0.75, -0.75, 2.2, -2.2, Math.PI]) mesh(rig.body, box(0.03, 0.085, 0.014), dark, [Math.sin(a) * 0.335, 0.9, Math.cos(a) * 0.268], [0, a, 0])
  for (let k = 0; k < 4; k++) mesh(rig.body, cyl(0.007, 0.007, 0.012, 10), gold, [0.085 + k * 0.035, 0.9, 0.262 - k * 0.006 - k * k * 0.0015], [Math.PI / 2, 0, 0])
  for (const side of [1, -1]) {
    // topstitching down the lapels
    stitches(rig.chest, [v(side * 0.165, 1.44, 0.228), v(side * 0.225, 1.25, 0.312), v(side * 0.165, 1.02, 0.3), v(side * 0.11, 0.87, 0.31)], thread, { count: 30 })
  }
  // back seam of the coat
  stitches(rig.chest, [v(0.045, 1.4, -0.3), v(0.045, 1.15, -0.332), v(0.045, 0.9, -0.33)], thread, { count: 26 })
  stitches(rig.chest, [v(-0.045, 1.4, -0.3), v(-0.045, 1.15, -0.332), v(-0.045, 0.9, -0.33)], thread, { count: 26 })
  // fur collar: three plush rows
  furRing(rig.chest, fur, { r: 0.33, y: 1.47, count: 26, len: 0.2, w: 0.13, rows: 3, squash: 0.85, seed: 3, droop: 0.5 })
  mesh(rig.chest, torus(0.25, 0.1), fur, [0, 1.46, -0.01], [Math.PI / 2, 0, 0], [1, 0.85, 1])
  // inverted cross on the back of the coat
  mesh(rig.chest, new THREE.BoxGeometry(0.05, 0.36, 0.012), white, [0, 1.1, -0.325])
  mesh(rig.chest, new THREE.BoxGeometry(0.2, 0.05, 0.012), white, [0, 1.0, -0.322])

  /* coat skirt in panels that trail behind movement */
  const panels = 9
  for (let i = 0; i < panels; i++) {
    const a0 = 0.5 + (i / panels) * (Math.PI * 2 - 1.0), a1 = 0.5 + ((i + 1) / panels) * (Math.PI * 2 - 1.0) + 0.04
    const pivot = v(Math.sin((a0 + a1) / 2) * 0.35, 0.86, Math.cos((a0 + a1) / 2) * 0.29)
    const geo = sheet((u, t) => {
      const a = a0 + (a1 - a0) * u
      const rad = 0.36 + t * 0.2 + Math.sin(u * Math.PI) * 0.018 * t
      return v(Math.sin(a) * rad, 0.88 - t * 0.66 - Math.sin(u * Math.PI) * 0.03 * t, Math.cos(a) * rad * 0.84).sub(pivot)
    }, 6, 8, 0.022)
    const m = mesh(rig.body, geo, coatM)
    m.position.copy(pivot)
    m.userData.keep = true
    swaying(rig, m, 0.35 + (i % 3) * 0.08)
  }
  furRing(rig.body, fur, { r: 0.37, y: 0.865, count: 22, len: 0.1, w: 0.07, rows: 1, squash: 0.84, seed: 9, arc: [0.5, Math.PI * 2 - 0.5] })

  for (const arm of rig.arms) {
    // shoulder seam and fur cuff
    mesh(arm.shoulder, torus(0.123, 0.014), dark, [0, -UPPER * 0.02, 0], [Math.PI / 2, 0, 0])
    furRing(arm.elbow, fur, { r: 0.125, y: -FORE + 0.05, count: 13, len: 0.1, w: 0.07, rows: 2, seed: arm.side + 4, droop: 0.6 })
    mesh(arm.elbow, torus(0.11, 0.05), fur, [0, -FORE + 0.045, 0], [Math.PI / 2, 0, 0])
    // signet rings
    mesh(arm.fingers[arm.side > 0 ? 1 : 2], torus(0.0255, 0.007, Math.PI * 2, 18), gold, [0, -0.028, 0], [Math.PI / 2, 0, 0])
    mesh(arm.fingers[arm.side > 0 ? 1 : 2], sphere(0.012, 10, 8), mat('#3fd6d0', { rough: 0.1, coat: 1 }), [arm.side * 0.027, -0.028, 0])
  }

  rig.legs.forEach((leg, i) => {
    const side = i ? -1 : 1
    mesh(leg, legGeo(0.15, 0.125, 0.56, 1.03, 0.009), dark)
    // trouser crease
    mesh(leg, sweep([v(0, -0.05, 0.15), v(0, -0.3, 0.145), v(0, -0.54, 0.128)], { w: 0.02, t: 0.012, up: v(0, 0, 1), profile: even }), dark)
    shoe(leg, side, 0.6, { upper: leather, sole: dark, toe: leather, lace: dark, thread, high: 0.16, size: 1.12, heel: 0.03 })
    mesh(leg, torus(0.125, 0.014), gold, [0, -0.5, 0], [Math.PI / 2, 0, 0])
    // buckled strap across the boot shaft
    mesh(leg, torus(0.131, 0.016), leather, [0, -0.44, 0], [Math.PI / 2, 0, 0])
    mesh(leg, box(0.05, 0.046, 0.014), gold, [side * 0.07, -0.44, 0.115], [0, side * 0.55, 0])
    mesh(leg, box(0.026, 0.024, 0.018), leather, [side * 0.07, -0.44, 0.115], [0, side * 0.55, 0])
    stitches(leg, ring(0.128, -0.39, 1, 16), thread, { count: 34, closed: true })
  })

  /* Bandit's Secret: an open book resting on the palm */
  const book = group(rig.chest, [-0.56, 1.02, 0.42], [1.0, 0.35, 0.1])
  const cover = mat('#ffffff', { rough: 0.5, coat: 0.3, map: coverTexture() })
  const paper = mat('#f4ead2', { rough: 0.9 })
  const pages: THREE.Object3D[] = []
  for (const s of [1, -1]) {
    const half = group(book, [0, 0, 0], [0, 0, s * 0.32])
    mesh(half, box(0.3, 0.02, 0.4, 0.006), cover, [s * 0.15, -0.012, 0])
    // the page block is a stack of separate leaves, fanned slightly
    for (let k = 0; k < 9; k++) mesh(half, new THREE.BoxGeometry(0.27 - k * 0.0035, 0.0034, 0.37 - k * 0.002), paper, [s * (0.145 - k * 0.0012), 0.0 + k * 0.0042, 0])
    // gilded corners and a ruled border
    for (const z of [1, -1]) mesh(half, box(0.045, 0.026, 0.045, 0.004), gold, [s * 0.28, -0.012, z * 0.18])
    for (let k = 0; k < 4; k++) mesh(half, new THREE.BoxGeometry(0.16 - (k % 2) * 0.05, 0.002, 0.007), ink, [s * 0.14, 0.0345, -0.145 + k * 0.022])
    for (let k = 0; k < 5; k++) mesh(half, new THREE.BoxGeometry(0.2, 0.002, 0.012), ink, [s * 0.15, 0.034, -0.12 + k * 0.06])
  }
  mesh(book, cyl(0.022, 0.022, 0.4, 10), cover, [0, -0.012, 0], [Math.PI / 2, 0, 0])
  for (let k = 0; k < 3; k++) {
    const page = group(book, [0, 0.03, 0])
    mesh(page, sheet((u, t) => v(u * 0.26, Math.sin(u * Math.PI) * 0.03, (t - 0.5) * 0.36), 6, 1), mat('#fbf4e2', { rough: 0.9, side: THREE.DoubleSide })).userData.keep = true
    pages.push(page)
  }
  // ribbon bookmark trailing out of the spine
  const mark = mesh(book, sweep([v(0, 0.03, -0.18), v(0.01, 0.01, -0.24), v(0.03, -0.06, -0.27), v(0.02, -0.14, -0.26)], { w: 0.022, t: 0.004, up: v(0, 0, -1), profile: even, seg: 14 }), mat('#b3202a', { rough: 0.6, side: THREE.DoubleSide }))
  mark.userData.keep = true
  for (const z of [-0.14, -0.05, 0.05, 0.14]) mesh(book, torus(0.0235, 0.004, Math.PI * 2, 16), gold, [0, -0.012, z])
  // glowing sigil above the pages
  const sigil = mesh(book, torus(0.09, 0.008), mat('#b9a4ff', { emissive: '#8f6bff', glow: 2.2, rough: 0.3 }), [0, 0.2, 0], [Math.PI / 2, 0, 0])
  sigil.userData.keep = true
  const sigil2 = mesh(sigil, torus(0.055, 0.006), mat('#e9e0ff', { emissive: '#b9a4ff', glow: 2.4 }))
  sigil2.userData.keep = true

  return {
    rig,
    rest: [
      { s: [0.1, 0, 0.16], e: 0.3, curl: 0.5 },
      { s: [-0.55, 0, -0.3], e: 0.9, curl: 0.1 },
    ],
    waveArm: 0,
    cheerArms: [true, false],
    tick: ({ time, cheer }) => {
      book.position.y = 1.02 + Math.sin(time * 1.6) * 0.025 + cheer * 0.12
      book.rotation.z = 0.1 + Math.sin(time * 1.1) * 0.05
      pages.forEach((p, k) => {
        const turn = (time * 0.5 + k * 0.33) % 1
        p.rotation.z = 0.35 + turn * (Math.PI - 0.7)
      })
      sigil.rotation.z = time * 1.4
      sigil2.rotation.z = -time * 3
      sigil.position.y = 0.2 + Math.sin(time * 2) * 0.015 + cheer * 0.08
      sigil.scale.setScalar(1 + cheer * 0.6)
    },
  }
}
