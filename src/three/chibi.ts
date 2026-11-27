import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { CompanionId } from '../data/companions'

export type Chibi = {
  id: CompanionId
  root: THREE.Group
  update: (t: number, dt: number, turn?: number) => void
  wave: () => void
  celebrate: () => void
  look: (x: number, y: number) => void
  /** a quick pleased nod, or a short slump after a mistake */
  react: (mood: 'happy' | 'sad') => void
  sleep: (on: boolean) => void
}

type V3 = [number, number, number]
type Side = 'L' | 'R'
type Bones = Record<string, THREE.Bone>
type Motion = { time: number; dt: number; wave: number; cheer: number; air: number; bones: Bones }

type Spec = {
  /** bone rotations of the idle pose, in model axes (x right, y up, z towards the viewer) */
  rest: Record<string, V3>
  waveArm: Side
  cheerArms: Side[]
  tick?: (m: Motion) => void
}

const specs: Record<CompanionId, Spec> = {
  kuroko: {
    rest: { upperarm_R: [-0.55, 0, 0.12], forearm_R: [-1.75, 0, 0.1], hand_R: [-0.25, 0, 0], upperarm_L: [0.06, 0, -0.04], forearm_L: [-0.18, 0, 0] },
    waveArm: 'L',
    cheerArms: ['L'],
    tick: ({ bones, time, air }) => {
      if (bones.prop) { bones.prop.rotation.y = time * 5; bones.prop.position.y = bones.prop.userData.y + air * 0.25 }
    },
  },
  chrollo: {
    rest: { upperarm_L: [-0.2, 0, 0.08], forearm_L: [-1.3, 0, 0], hand_L: [0, 1.45, 0] },
    waveArm: 'R',
    cheerArms: ['R'],
  },
  ichigo: { rest: { upperarm_R: [0, 0, 0.1], forearm_R: [-0.35, 0, 0], upperarm_L: [0, 0, -0.1] }, waveArm: 'L', cheerArms: ['L'] },
  anya: {
    rest: { upperarm_R: [-0.5, 0, 0.1], forearm_R: [-1.7, 0, 0.15], upperarm_L: [0, 0, -0.12] },
    waveArm: 'L',
    cheerArms: ['L'],
  },
}

const base = import.meta.env.BASE_URL
const draco = new DRACOLoader().setDecoderPath(`${base}draco/`)
const loader = new GLTFLoader().setDRACOLoader(draco)
const cache = new Map<string, Promise<GLTF>>()

function load(id: CompanionId, lite: boolean) {
  const url = `${base}models/${id}${lite ? '-lite' : ''}.glb`
  let hit = cache.get(url)
  if (!hit) {
    hit = loader.loadAsync(url)
    hit.catch(() => cache.delete(url))
    cache.set(url, hit)
  }
  return hit
}

const TOON_PARS = /* glsl */ `
varying vec3 vViewPosition;
uniform vec3 uTint;
struct ToonMaterial { vec3 diffuseColor; };
// two flat tones with a hard edge; cast shadows fall into the same shade tone instead of going grey
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	float open = clamp( max( directLight.color.r, max( directLight.color.g, directLight.color.b ) ) / PI, 0.0, 1.0 );
	float lit = smoothstep( 0.0, 0.035, dot( geometryNormal, directLight.direction ) ) * smoothstep( 0.42, 0.58, open );
	reflectedLight.directDiffuse += mix( uTint, vec3( 1.0 ), lit ) * material.diffuseColor;
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {}
#define RE_Direct RE_Direct_Toon
#define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
`

const TOON_RIM = /* glsl */ `
	{
		vec3 rimView = normalize( vViewPosition );
		float rimEdge = smoothstep( 0.6, 0.66, 1.0 - max( dot( normal, rimView ), 0.0 ) );
		float rimSide = smoothstep( 0.05, 0.3, normal.y * 0.7 - normal.x * 0.7 );
		outgoingLight += ( diffuseColor.rgb * 0.3 + 0.14 ) * rimEdge * rimSide;
	}
	#include <opaque_fragment>
`

function toonMaterial(color: THREE.Color, vertexColors: boolean, tint: string) {
  const m = new THREE.MeshToonMaterial({ color, vertexColors })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = { value: new THREE.Color(tint) }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', TOON_PARS)
      .replace('#include <opaque_fragment>', TOON_RIM)
  }
  m.customProgramCacheKey = () => 'cel'
  return m
}

function outlineMaterial(width: number) {
  const m = new THREE.MeshBasicMaterial({ color: '#2a2030', side: THREE.BackSide })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${width.toFixed(4)};`)
  }
  return m
}

/** Swaps the exported materials for cel-shaded ones and adds an inked hull around every lit surface. */
function stylise(root: THREE.Object3D) {
  const ink = outlineMaterial(0.011)
  const hulls: THREE.SkinnedMesh[] = []
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh
    if (!mesh.isMesh) return
    const src = mesh.material as THREE.MeshStandardMaterial
    const data = src.userData as { kind?: string; outline?: number; tint?: string }
    const vertexColors = !!mesh.geometry.attributes.color
    mesh.frustumCulled = false
    if (data.kind === 'unlit') {
      mesh.material = new THREE.MeshBasicMaterial({ color: src.color, vertexColors, transparent: src.transparent, depthWrite: !src.transparent, toneMapped: false, side: THREE.DoubleSide })
      return
    }
    mesh.material = data.kind === 'metal'
      ? new THREE.MeshStandardMaterial({ color: src.color, vertexColors, metalness: 0.9, roughness: 0.3 })
      : toonMaterial(src.color, vertexColors, data.tint ?? '#b9a9d4')
    mesh.castShadow = true
    mesh.receiveShadow = data.kind !== 'metal'
    if (data.outline && mesh.isSkinnedMesh) {
      const hull = new THREE.SkinnedMesh(mesh.geometry, ink)
      hull.bind(mesh.skeleton, mesh.bindMatrix)
      hull.frustumCulled = false
      hull.userData.hull = true
      hulls.push(hull)
      mesh.parent?.add(hull)
    }
  })
  return hulls
}

const ease = (x: number) => x * x * (3 - 2 * x)
const WAVE = 1.9
const CHEER = 2.6
const NOD = 1.3
const SLUMP = 1.9

export async function createChibi(id: CompanionId, reducedMotion = false, lite = false): Promise<Chibi> {
  const gltf = await (lite ? load(id, true).catch(() => load(id, false)) : load(id, false))
  const model = clone(gltf.scene) as THREE.Group
  stylise(model)
  const root = new THREE.Group()
  root.add(model)
  const spec = specs[id]
  const bones: Bones = {}
  const meshes: THREE.Object3D[] = []
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) { bones[o.name] = o as THREE.Bone; o.userData.y = o.position.y; o.userData.rest = o.position.clone() }
    else if ((o as THREE.Mesh).isMesh && !o.userData.hull) meshes.push(o)
  })
  const toggles = Object.fromEntries(['eyes_open', 'iris', 'eyes_closed', 'eyes_happy', 'mouth_open', 'mouth_rest'].map((name) => [name, meshes.filter((o) => o.name === name || o.parent?.name === name)]))
  const show = (name: string, on: boolean) => { for (const o of toggles[name]) o.visible = on }
  const rot = (name: string, x = 0, y = 0, z = 0) => {
    const b = bones[name]
    if (!b) return
    const r = spec.rest[name]
    b.rotation.set((r?.[0] ?? 0) + x, (r?.[1] ?? 0) + y, (r?.[2] ?? 0) + z)
  }
  const sway = Object.values(bones).filter((b) => b.name.startsWith('sway')).map((bone, i) => ({ bone, ax: 0, az: 0, vx: 0, vz: 0, phase: i * 1.7, gain: bone.name.includes('soft') ? 1.6 : 1 }))

  const phase = { chrollo: 0, kuroko: 1.3, ichigo: 2.6, anya: 3.9 }[id]
  let wave = 0
  let cheer = 0
  let nod = 0
  let slump = 0
  let asleep = false
  let doze = 0
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
  const ahead = new THREE.Vector2()

  const update = (t: number, dt: number, turn = 0) => {
    const time = reducedMotion ? 0 : t + phase
    wave = Math.max(0, wave - dt)
    cheer = Math.max(0, cheer - dt)
    nod = Math.max(0, nod - dt)
    slump = Math.max(0, slump - dt)
    const nodPos = nod > 0 ? 1 - nod / NOD : 0
    const nodK = nod > 0 ? ease(Math.min(1, nodPos * 6)) * ease(Math.min(1, (1 - nodPos) * 3)) : 0
    const slumpPos = slump > 0 ? 1 - slump / SLUMP : 0
    const slumpK = slump > 0 ? ease(Math.min(1, slumpPos * 5)) * ease(Math.min(1, (1 - slumpPos) * 3)) : 0
    const wavePos = wave > 0 ? 1 - wave / WAVE : 0
    const cheerPos = cheer > 0 ? 1 - cheer / CHEER : 0
    const waveK = greet ? 1 : wave > 0 ? ease(Math.min(1, wavePos * 5)) * ease(Math.min(1, (1 - wavePos) * 4)) : 0
    const cheerK = cheer > 0 ? ease(Math.min(1, cheerPos * 6)) * ease(Math.min(1, (1 - cheerPos) * 4)) : 0

    // breathing and a gentle weight shift
    doze += ((asleep && wave <= 0 && cheer <= 0 ? 1 : 0) - doze) * (reducedMotion ? 1 : Math.min(1, dt * 3))
    const breath = Math.sin(time * (1.7 - doze * 0.8)) * (1 + doze * 1.2)
    bones.chest?.scale.set(1 + breath * 0.008, 1 + breath * 0.006, 1 + breath * 0.014)
    rot('spine', Math.sin(time * 0.6) * 0.012 - cheerK * 0.08 + slumpK * 0.12 + doze * 0.05, 0, Math.sin(time * 0.85) * 0.014)
    rot('hips', 0, 0, -Math.sin(time * 0.85) * 0.01)

    // jumps: three bounces for a celebration, a little hop for a greeting
    const bounce = cheer > 0 ? Math.abs(Math.sin(cheerPos * Math.PI * 3)) * 0.42 * cheerK : wave > 0 ? Math.sin(Math.min(1, wavePos * 3.2) * Math.PI) * 0.14 : nod > 0 ? Math.sin(Math.min(1, nodPos * 2.6) * Math.PI) * 0.1 : 0
    const crouch = cheer > 0 ? Math.max(0, 0.08 - bounce) * cheerK : 0
    root.position.y = bounce
    root.scale.set(1 + crouch * 0.4, 1 - crouch, 1 + crouch * 0.4)
    const vy = dt > 0 ? (bounce - lastY) / dt : 0
    lastY = bounce
    const tuck = Math.min(0.7, bounce * 1.8)
    for (const [side, k] of [['L', 0.7], ['R', 1]] as const) {
      rot(`thigh_${side}`, -tuck * k, 0, 0)
      rot(`shin_${side}`, tuck * 1.7 * k, 0, 0)
    }

    // head: follow the pointer, tilt now and then
    gaze.lerp(doze > 0.5 ? ahead : target, Math.min(1, dt * 6))
    nextFidget -= dt
    if (nextFidget <= 0 && !reducedMotion) {
      tiltTarget = tiltTarget === 0 ? (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.07) : 0
      nextFidget = tiltTarget === 0 ? 4 + Math.random() * 5 : 1.4 + Math.random()
    }
    tilt += (tiltTarget - tilt) * Math.min(1, dt * 4)
    const yaw = gaze.x * 0.4
    const yawVel = dt > 0 ? (yaw - headYaw) / dt : 0
    headYaw = yaw
    const waveSide = spec.waveArm === 'L' ? 1 : -1
    rot('neck', -gaze.y * 0.08, yaw * 0.35, 0)
    rot('head', -gaze.y * 0.16 + Math.sin(time * 1.1) * 0.015 - cheerK * 0.12 + slumpK * 0.36 + doze * (0.24 + Math.sin(time * 0.9) * 0.03) + nodK * Math.sin(nodPos * Math.PI * 4) * 0.16, yaw * 0.65, tilt * (1 - doze) + doze * 0.2 + Math.sin(time * 0.8) * 0.015 - waveK * 0.09 * waveSide)
    if (bones.eyes) {
      const rest = bones.eyes.userData.rest as THREE.Vector3
      bones.eyes.position.set(rest.x + gaze.x * 0.012, rest.y + gaze.y * 0.008, rest.z)
    }

    // face
    nextBlink -= dt
    if (nextBlink <= 0) { blink = 0.13; nextBlink = 2.2 + Math.random() * 3.4 }
    blink = Math.max(0, blink - dt)
    const happy = cheerK > 0.35 || nodK > 0.3 || (greet && reducedMotion)
    const closed = !happy && ((blink > 0 && !reducedMotion) || slumpK > 0.3 || doze > 0.5)
    show('eyes_open', !happy && !closed)
    show('iris', !happy && !closed)
    show('eyes_closed', closed)
    show('eyes_happy', happy)
    const open = cheerK > 0.35 || waveK > 0.35 || (greet && reducedMotion)
    show('mouth_open', open)
    show('mouth_rest', !open)
    if (bones.brows) bones.brows.position.y = bones.brows.userData.y + Math.max(cheerK, waveK * 0.7, nodK * 0.8) * 0.018 - slumpK * 0.014

    // arms
    for (const side of ['L', 'R'] as const) {
      const s = side === 'L' ? 1 : -1
      const idle = Math.sin(time * 1.7 + (s > 0 ? 0 : 1.4)) * 0.02
      const k = Math.max(side === spec.waveArm ? waveK : 0, spec.cheerArms.includes(side) ? cheerK : 0)
      const cheering = spec.cheerArms.includes(side) && cheerK > 0
      const wag = cheering ? Math.sin(t * 13 + s) * 0.12 : greet ? 0 : Math.sin(t * 11) * 0.4
      // blend from the idle pose to an arm raised beside the head
      const r = spec.rest
      const up: V3 = [0, 0, s * (cheering ? 2.75 : 2.3)]
      const fore: V3 = [0, 0, s * ((cheering ? 0.25 : 0.7) + wag)]
      const mix = (name: string, to: V3) => {
        const from = r[name] ?? [0, 0, 0]
        const b = bones[name]
        if (b) b.rotation.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k + (name.startsWith('upper') ? s * idle : 0))
      }
      mix(`upperarm_${side}`, up)
      mix(`forearm_${side}`, fore)
      mix(`hand_${side}`, k > 0 ? [0, 0, 0] : r[`hand_${side}`] ?? [0, 0, 0])
    }

    // hair, cloth and trinkets lag behind the body
    for (const s of sway) {
      const tx = THREE.MathUtils.clamp(vy * 0.12, -0.5, 0.5) * s.gain + Math.sin(time * 1.6 + s.phase) * 0.028 * s.gain
      const tz = THREE.MathUtils.clamp(-(yawVel * 0.05 + turn * 4), -0.5, 0.5) * s.gain + Math.sin(time * 1.25 + s.phase * 1.3) * 0.022 * s.gain
      s.vx += ((tx - s.ax) * 60 - s.vx * 7) * dt
      s.vz += ((tz - s.az) * 60 - s.vz * 7) * dt
      s.ax += s.vx * dt
      s.az += s.vz * dt
      if (reducedMotion) { s.ax = 0; s.az = 0 }
      s.bone.rotation.set(s.ax, 0, s.az)
    }

    spec.tick?.({ time, dt: reducedMotion ? 0 : dt, wave: waveK, cheer: cheerK, air: bounce, bones })
  }
  update(0, 0)

  return {
    id,
    root,
    wave: () => { if (reducedMotion) greet = !greet; else if (cheer <= 0) wave = WAVE },
    celebrate: () => { if (reducedMotion) greet = true; else { cheer = CHEER; wave = 0 } },
    look: (x, y) => target.set(x, -y),
    react: (mood) => { if (reducedMotion || cheer > 0) return; if (mood === 'happy') { nod = NOD; slump = 0 } else { slump = SLUMP; nod = 0 } },
    sleep: (on) => { asleep = on },
    update,
  }
}
