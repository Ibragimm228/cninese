import * as THREE from 'three'
import { FORE, buildRig, legGeo, shoe, torsoGeo } from '../body'
import type { Character } from '../chibi'
import { fall, hairline, lock, scalp } from '../hair'
import { canvasTexture, grain, group, mat, mesh, rng, sphere, sweep, torus, turned, v } from '../kit'

function jerseyTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#fbfbf7'
    ctx.fillRect(0, 0, w, h)
    // side panels with piping; u = 0.25 and 0.75 are the flanks
    for (const u of [0.25, 0.75]) {
      ctx.fillStyle = '#16171c'
      ctx.fillRect((u - 0.045) * w, 0, 0.09 * w, h)
      ctx.fillStyle = '#d7262d'
      ctx.fillRect((u - 0.06) * w, 0, 0.014 * w, h)
      ctx.fillRect((u + 0.046) * w, 0, 0.014 * w, h)
    }
    // hem band
    ctx.fillStyle = '#16171c'
    ctx.fillRect(0, h * 0.94, w, h * 0.03)
    ctx.fillStyle = '#d7262d'
    ctx.fillRect(0, h * 0.975, w, h * 0.025)
    const text = (label: string, u: number, y: number, size: number, stroke = true) => {
      ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(u * w, y * h)
      ctx.scale(0.5, 1)
      if (stroke) {
        ctx.lineWidth = size * 0.16
        ctx.strokeStyle = '#d7262d'
        ctx.lineJoin = 'round'
        ctx.strokeText(label, 0, 0)
      }
      ctx.fillStyle = '#16171c'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }
    text('SEIRIN', 0.5, 0.33, 58, false)
    text('11', 0.5, 0.58, 150)
    text('KUROKO', 0, 0.26, 44, false)
    text('KUROKO', 1, 0.26, 44, false)
    text('11', 0, 0.55, 190)
    text('11', 1, 0.55, 190)
  })
}

function ballTextures() {
  const map = canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#f08a3c')
    g.addColorStop(1, '#d9601f')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#1b1512'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    for (const u of [0.25, 0.75]) { ctx.moveTo(u * w, 0); ctx.lineTo(u * w, h) }
    for (const u of [0, 0.5, 1]) {
      for (const k of [1, -1]) {
        ctx.moveTo(u * w + k * 0.045 * w, 0)
        ctx.bezierCurveTo(u * w + k * 0.16 * w, h * 0.3, u * w + k * 0.16 * w, h * 0.7, u * w + k * 0.045 * w, h)
      }
    }
    ctx.stroke()
  })
  const bump = canvasTexture(256, 256, (ctx, w, h) => {
    const r = rng(3)
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? '#b0b0b0' : '#585858'
      ctx.beginPath()
      ctx.arc(r() * w, r() * h, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  bump.colorSpace = THREE.NoColorSpace
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping
  bump.repeat.set(3, 2)
  return { map, bump }
}

export function kuroko(): Character {
  const hairM = mat('#8fd4f5', { rough: 0.42, coat: 0.5, sheen: 0.4, sheenColor: '#e8fbff' })
  const hairDeep = mat('#6fbfe8', { rough: 0.5, coat: 0.3 })
  const rig = buildRig(
    { iris: ['#2f7fb8', '#62c1ee', '#c9f1ff'], pupil: '#1a4f7c', lash: '#2c4a63', brow: '#6aaed2', browWeight: 0.7, browArch: 0.18, browTilt: -0.02, mouth: 'flat', blush: 0.3, w: 0.6, h: 0.66, tilt: 0.02, flat: 0.12, lashWeight: 0.85 },
    { upper: mat('#ffdcc4', { rough: 0.55, coat: 0.18 }), lower: mat('#ffdcc4', { rough: 0.55, coat: 0.18 }), upperR: [0.1, 0.088], lowerR: [0.086, 0.074] },
  )
  const white = mat('#fbfbf7', { rough: 0.7, coat: 0.05, bump: grain(128, 30, 2, true), bumpScale: 0.6 })
  const black = mat('#17181d', { rough: 0.6, coat: 0.1 })
  const red = mat('#d7262d', { rough: 0.55, coat: 0.15 })
  const rubber = mat('#f4f4f0', { rough: 0.8, coat: 0 })

  /* hair: a soft, layered mop with flicked tips */
  scalp(rig, hairDeep, hairline(0.7, -0.3, -0.8))
  const r = rng(11)
  for (let i = 0; i < 11; i++) {
    const yaw = -0.86 + i * 0.172 + (r() - 0.5) * 0.05
    const long = i % 2 === 0
    fall(rig, hairM, yaw, (long ? 0.13 : 0.3) - Math.abs(yaw) * 0.2, { w: 0.3 + r() * 0.05, t: 0.075, lift: 1.085, tip: 1.07, swoop: (yaw < 0 ? 0.28 : -0.28) + (i === 5 ? 0.3 : 0), from: 1.2 })
  }
  for (const side of [1, -1]) {
    // locks in front of the ears
    fall(rig, hairM, side * 1.02, -0.42, { w: 0.3, t: 0.08, lift: 1.09, tip: 1.1, swoop: -side * 0.1, sway: 0.6 })
    fall(rig, hairM, side * 1.24, -0.52, { w: 0.32, t: 0.08, lift: 1.1, tip: 1.14, swoop: -side * 0.05, sway: 0.8 })
    fall(rig, hairM, side * 1.5, -0.3, { w: 0.34, t: 0.08, lift: 1.1, tip: 1.16 })
  }
  for (let i = 0; i < 13; i++) {
    const yaw = 1.75 + (i / 12) * (Math.PI * 2 - 3.5)
    fall(rig, hairM, yaw, -0.62 - (i % 2) * 0.14, { w: 0.4, t: 0.09, lift: 1.1, tip: 1.2 + (i % 3) * 0.04, swoop: (r() - 0.5) * 0.3, sway: i % 2 ? 0.5 : 0 })
  }
  // upper layer and stray tufts that give the silhouette some air
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * Math.PI * 2 + 0.2
    fall(rig, hairM, yaw, 0.5 + r() * 0.2, { w: 0.42, t: 0.1, lift: 1.12, tip: 1.19, swoop: 0.45, from: 1.42 })
  }
  for (const [yaw, pitch, lean] of [[0.5, 1.05, 0.5], [-0.7, 1.0, -0.4], [2.4, 0.9, 0.4], [-2.2, 0.95, -0.5], [0.1, 1.3, 0.2]] as const) {
    lock(rig, hairM, [[yaw, pitch, 1.05], [yaw + lean * 0.4, pitch + 0.05, 1.2], [yaw + lean, pitch - 0.02, 1.34]], { w: 0.2, t: 0.06, sway: 0.5 })
  }

  /* jersey */
  const jersey = mat('#ffffff', { rough: 0.72, coat: 0.04, map: jerseyTexture(), bump: grain(128, 24, 4, true), bumpScale: 0.5 })
  mesh(rig.chest, torsoGeo({ shoulder: 0.345, waist: 0.31, hip: 0.35, bottom: 0.78 }), jersey, [0, 0, 0], [0, 0, 0], [1, 1, 0.8])
  // collar: black with a red edge, dipping into a V
  mesh(rig.chest, torus(0.135, 0.026), black, [0, 1.475, 0.012], [Math.PI / 2 + 0.22, 0, 0], [1, 0.95, 1])
  mesh(rig.chest, torus(0.165, 0.014), red, [0, 1.463, 0.016], [Math.PI / 2 + 0.22, 0, 0], [1, 0.95, 1])
  for (const arm of rig.arms) {
    // armhole trim
    mesh(arm.shoulder, torus(0.118, 0.022), black, [-arm.side * 0.02, 0.0, 0], [0, Math.PI / 2, 0], [1, 1.15, 1])
    mesh(arm.shoulder, torus(0.136, 0.011), red, [-arm.side * 0.03, 0.0, 0], [0, Math.PI / 2, 0], [1, 1.15, 1])
    // wristband
    mesh(arm.elbow, turned([[0.079, -FORE + 0.1], [0.087, -FORE + 0.085], [0.086, -FORE + 0.025], [0.077, -FORE + 0.012]], 20, 8), black)
  }

  /* shorts */
  const shorts = mat('#fbfbf7', { rough: 0.72, coat: 0.04, bump: grain(128, 24, 5, true), bumpScale: 0.5 })
  mesh(rig.body, turned([[0.33, 0.9], [0.36, 0.84], [0.37, 0.7], [0.3, 0.6], [0, 0.58]], 32, 14), shorts, [0, 0, 0], [0, 0, 0], [1, 1, 0.82])
  mesh(rig.body, torus(0.33, 0.022), black, [0, 0.885, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1])
  rig.legs.forEach((leg, i) => {
    const side = i ? -1 : 1
    mesh(leg, turned([[0.17, 0.06], [0.2, -0.1], [0.215, -0.3], [0.2, -0.31], [0.16, -0.26]], 26, 12), shorts, [side * 0.01, 0, 0])
    mesh(leg, torus(0.212, 0.014), red, [side * 0.01, -0.292, 0], [Math.PI / 2, 0, 0])
    mesh(leg, torus(0.214, 0.014), black, [side * 0.01, -0.262, 0], [Math.PI / 2, 0, 0])
    // side stripe
    mesh(leg, sweep([v(side * 0.185, 0.05, 0), v(side * 0.212, -0.1, 0), v(side * 0.226, -0.25, 0)], { w: 0.07, t: 0.012, profile: () => 1, up: v(side, 0, 0), sides: 6 }), black)
    mesh(leg, legGeo(0.125, 0.1, 0.62, 1.02), rig.skin)
    // knee
    mesh(leg, sphere(0.1, 14, 10), rig.skin, [0, -0.36, 0.035], [0, 0, 0], [1, 1, 0.7])
    // sock with two bands
    mesh(leg, turned([[0.102, -0.4], [0.112, -0.42], [0.108, -0.56], [0.1, -0.64]], 22, 10), white)
    mesh(leg, torus(0.112, 0.012), black, [0, -0.44, 0], [Math.PI / 2, 0, 0])
    mesh(leg, torus(0.111, 0.012), red, [0, -0.475, 0], [Math.PI / 2, 0, 0])
    shoe(leg, side, 0.62, { upper: white, sole: rubber, toe: black, lace: red, tongue: black, stripe: red, high: 0.1, size: 1.12 })
  })

  /* basketball spinning on a fingertip */
  const { map, bump } = ballTextures()
  const ball = group(rig.arms[1].hand, [0, -0.47, 0.03])
  const ballMesh = mesh(ball, sphere(0.27, 40, 28), mat('#ffffff', { rough: 0.78, coat: 0.05, map, bump, bumpScale: 1.4 }))
  ballMesh.userData.keep = true

  const character: Character = {
    rig,
    rest: [
      { s: [0.05, 0, 0.2], e: 0.25, curl: 0.35 },
      { s: [0, 0, -1.3], e: 0.2, w: [0, 0, -1.75], curl: 0.2 },
    ],
    waveArm: 0,
    cheerArms: [true, false],
    tick: ({ time, dt }) => {
      ballMesh.rotation.y += dt * 9
      ballMesh.rotation.z = Math.sin(time * 1.3) * 0.08
      ball.position.y = -0.47 + Math.sin(time * 3.4) * 0.006
    },
  }
  return character
}
