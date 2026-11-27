import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CompanionId } from '../data/companions'
import { createChibi, type Chibi } from './chibi'

export type StageOptions = {
  /** 0 none · 1 sparks · 2 halo · 3 golden crown — grows with the streak */
  tier?: number
  accent?: string
  interactive?: boolean
  reducedMotion?: boolean
  pedestal?: boolean
  preserve?: boolean
  zoom?: number
  /** tessellation scale, 1 = full; chosen from the device and cast size when omitted */
  detail?: number
}

export class ChibiStage {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60)
  private turntable = new THREE.Group()
  private chibis: Chibi[] = []
  private clock = new THREE.Clock()
  private raf = 0
  private visible = true
  private spin = 0
  private span = 2.9
  private spinVelocity = 0
  private dragging = false
  private lastX = 0
  private moved = 0
  private sparks?: THREE.Points
  private halo?: THREE.Mesh
  private crown?: THREE.Group
  private observers: { disconnect: () => void }[] = []
  private canvas: HTMLCanvasElement
  private options: StageOptions

  constructor(canvas: HTMLCanvasElement, ids: readonly CompanionId[], options: StageOptions = {}) {
    this.canvas = canvas
    this.options = options
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: options.preserve })
    this.renderer.setPixelRatio(options.preserve ? 1 : Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.55
    pmrem.dispose()

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9a7d8', 0.55))
    const key = new THREE.DirectionalLight('#fff4e6', 2.4)
    key.position.set(3.5, 7, 6)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -5
    key.shadow.camera.right = 5
    key.shadow.camera.top = 6
    key.shadow.camera.bottom = -2
    key.shadow.bias = -0.0015
    key.shadow.radius = 6
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(options.accent ?? '#9fb8ff', 2.2)
    rim.position.set(-5, 4, -6)
    this.scene.add(rim)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.ShadowMaterial({ opacity: 0.22 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    this.scene.add(this.turntable)

    if (options.pedestal) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.25, 1.35, 0.12, 64),
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.55 }),
      )
      disc.position.y = -0.06
      disc.receiveShadow = true
      this.turntable.add(disc)
    }

    this.setCompanions(ids)
    this.setTier(options.tier ?? 0)
    this.resize()

    const ro = new ResizeObserver(() => this.resize())
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting
      if (this.visible) this.start()
    })
    io.observe(canvas)
    this.observers.push(ro, io)

    if (options.interactive !== false) {
      canvas.addEventListener('pointerdown', this.onDown)
      window.addEventListener('pointermove', this.onMove)
      window.addEventListener('pointerup', this.onUp)
    }
    this.start()
  }

  setCompanions(ids: readonly CompanionId[]) {
    this.chibis.forEach((c) => this.turntable.remove(c.root))
    const gap = 2.25
    // a lone character gets every polygon; a line-up or a phone trades some away to stay smooth
    const small = typeof matchMedia === 'function' && matchMedia('(pointer: coarse), (max-width: 760px)').matches
    const detail = this.options.detail ?? (small ? (ids.length > 1 ? 0.5 : 0.7) : ids.length > 2 ? 0.7 : 1)
    this.chibis = ids.map((id, i) => {
      const chibi = createChibi(id, this.options.reducedMotion, detail)
      const offset = i - (ids.length - 1) / 2
      chibi.root.position.x = offset * gap
      const holder = new THREE.Group()
      holder.position.set(offset * gap, 0, -Math.abs(offset) * 0.7)
      holder.rotation.y = -offset * 0.22
      chibi.root.position.x = 0
      holder.add(chibi.root)
      this.turntable.add(holder)
      return { ...chibi, root: holder as THREE.Group, update: chibi.update, wave: chibi.wave, celebrate: chibi.celebrate, look: chibi.look }
    })
    this.span = (ids.length - 1) * gap + 2.9
    this.frame()
    this.render()
  }

  setTier(tier: number) {
    for (const o of [this.sparks, this.halo, this.crown]) if (o) this.scene.remove(o)
    this.sparks = this.halo = this.crown = undefined
    const color = new THREE.Color(this.options.accent ?? '#ffd76a')
    if (tier >= 1) {
      const count = 46
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        const r = 1.5 + ((i * 37) % 10) / 14
        positions.set([Math.cos(a) * r, 0.3 + ((i * 53) % 30) / 9, Math.sin(a) * r], i * 3)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      this.sparks = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))
      this.scene.add(this.sparks)
    }
    if (tier >= 2) {
      this.halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.55, 0.035, 12, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      )
      this.halo.rotation.x = Math.PI / 2
      this.halo.position.y = 0.04
      this.scene.add(this.halo)
    }
    if (tier >= 3) {
      const gold = new THREE.MeshPhysicalMaterial({ color: '#ffd14d', metalness: 1, roughness: 0.18, emissive: '#b8860b', emissiveIntensity: 0.35 })
      this.crown = new THREE.Group()
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 32, 1, true), gold)
      gold.side = THREE.DoubleSide
      this.crown.add(band)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 4), gold)
        tip.position.set(Math.cos(a) * 0.42, 0.18, Math.sin(a) * 0.42)
        this.crown.add(tip)
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshPhysicalMaterial({ color: '#ff4d6d', roughness: 0.05, clearcoat: 1, emissive: '#ff4d6d', emissiveIntensity: 0.5 }))
        gem.position.set(Math.cos(a) * 0.43, 0.02, Math.sin(a) * 0.43)
        this.crown.add(gem)
      }
      this.crown.position.set(0, 3.5, 0)
      this.scene.add(this.crown)
    }
    this.render()
  }

  wave() { this.chibis.forEach((c) => c.wave()); this.start() }
  celebrate() { this.chibis.forEach((c) => c.celebrate()); this.start() }

  snapshot() {
    this.render()
    return this.canvas.toDataURL('image/png')
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.raf = -1
    this.observers.forEach((o) => o.disconnect())
    this.canvas.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      const material = m.material as THREE.MeshPhysicalMaterial
      material.map?.dispose()
      material.dispose()
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true
    this.lastX = e.clientX
    this.moved = 0
  }

  private onMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    const x = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1.6, 1.6)
    const y = THREE.MathUtils.clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1.6, 1.6)
    this.chibis.forEach((c) => c.look(x, y))
    if (this.dragging) {
      const dx = e.clientX - this.lastX
      this.lastX = e.clientX
      this.moved += Math.abs(dx)
      this.spinVelocity = dx * 0.012
      this.spin += this.spinVelocity
    }
    if (this.options.reducedMotion) this.render()
  }

  private onUp = () => {
    if (this.dragging && this.moved < 5) this.wave()
    this.dragging = false
  }

  /** Pulls the camera back just far enough to fit the cast in both directions. */
  private frame() {
    const tan = Math.tan(THREE.MathUtils.degToRad(13))
    const fitHeight = 5.5 / (2 * tan)
    const fitWidth = this.span / (2 * tan * this.camera.aspect)
    this.camera.position.set(0, 2.25, Math.max(fitHeight, fitWidth) / (this.options.zoom ?? 1))
    this.camera.lookAt(0, 1.62, 0)
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.frame()
    this.camera.updateProjectionMatrix()
    this.render()
  }

  private start() {
    if (this.raf !== 0) return
    const loop = () => {
      if (this.raf === -1) return
      if (!this.visible) { this.raf = 0; return }
      this.render()
      this.raf = this.options.reducedMotion ? 0 : requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private render() {
    const dt = Math.min(0.05, this.clock.getDelta())
    const t = this.clock.elapsedTime
    if (!this.dragging) {
      this.spin += this.spinVelocity
      this.spinVelocity *= 0.94
      // ease back to facing the viewer once the flick has died down
      if (Math.abs(this.spinVelocity) < 0.002) {
        const home = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2
        this.spin += (home - this.spin) * Math.min(1, dt * 2.2)
      }
    }
    this.turntable.rotation.y = this.spin
    this.chibis.forEach((c) => c.update(t, dt))
    if (this.sparks) { this.sparks.rotation.y = t * 0.35; this.sparks.position.y = Math.sin(t * 1.3) * 0.12 }
    if (this.halo) this.halo.scale.setScalar(1 + Math.sin(t * 2) * 0.03)
    if (this.crown) { this.crown.rotation.y = t * 0.8; this.crown.position.y = 3.5 + Math.sin(t * 1.8) * 0.05 }
    this.renderer.render(this.scene, this.camera)
  }
}

const portraits = new Map<string, Promise<string>>()

/** Renders a still of a companion once and reuses it wherever a picture is enough. */
export function portrait(id: CompanionId, size = 420, tier = 0) {
  const key = `${id}:${size}:${tier}`
  let cached = portraits.get(key)
  if (!cached) {
    cached = new Promise<string>((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        Object.assign(canvas.style, { position: 'fixed', left: '-9999px', width: `${size}px`, height: `${size}px` })
        document.body.append(canvas)
        const stage = new ChibiStage(canvas, [id], { interactive: false, reducedMotion: true, preserve: true, zoom: 1.12, tier, detail: size > 512 ? 1 : 0.35 })
        const url = stage.snapshot()
        stage.dispose()
        canvas.remove()
        resolve(url)
      } catch (error) {
        reject(error)
      }
    })
    portraits.set(key, cached)
  }
  return cached
}
