import type { Companion } from '../data/companions'

const W = 1080
const H = 1350

function image(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Paints a collectible poster of the learner's companion and progress, returned as a PNG blob URL. */
export async function drawShareCard(o: { companion: Companion; name: string; streak: number; xp: number; words: number; tier: number }) {
  const { portrait } = await import('../three/stage')
  await document.fonts.ready
  const hero = await portrait(o.companion.id, 1024, o.tier).then(image).catch(() => null)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')!
  const { color, ink, glyph } = o.companion

  const bg = c.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(0.35, color)
  bg.addColorStop(1, ink)
  c.fillStyle = bg
  c.fillRect(0, 0, W, H)

  // sunburst
  c.save()
  c.translate(W / 2, 700)
  c.fillStyle = '#ffffff2e'
  for (let i = 0; i < 18; i++) {
    c.rotate(Math.PI / 9)
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(-90, -1400)
    c.lineTo(90, -1400)
    c.fill()
  }
  c.restore()

  c.fillStyle = `${ink}26`
  c.font = '900 900px "Noto Serif SC", serif'
  c.textAlign = 'center'
  c.fillText(glyph, W / 2, 900)

  if (hero) c.drawImage(hero, (W - 1000) / 2, 190, 1000, 1000)

  c.fillStyle = ink
  c.textAlign = 'left'
  c.font = '800 44px Unbounded, "Noto Serif SC", sans-serif'
  c.fillText('Mòlì · 学中文', 70, 110)
  c.textAlign = 'right'
  c.font = '700 30px ui-monospace, monospace'
  c.fillText(new Date().toLocaleDateString('ru-RU'), W - 70, 106)

  c.textAlign = 'left'
  c.fillStyle = '#ffffff'
  c.font = '800 250px Unbounded, sans-serif'
  c.lineWidth = 14
  c.strokeStyle = ink
  c.lineJoin = 'round'
  const streak = String(o.streak)
  c.strokeText(streak, 60, 400)
  c.fillText(streak, 60, 400)
  c.font = '800 40px Unbounded, sans-serif'
  c.fillStyle = ink
  c.fillText('ДН. ПОДРЯД', 70, 460)

  c.fillStyle = `${ink}e6`
  c.beginPath()
  c.roundRect(50, H - 230, W - 100, 180, 44)
  c.fill()
  c.fillStyle = '#ffffff'
  c.font = '800 54px Unbounded, sans-serif'
  c.fillText(o.name.slice(0, 16), 95, H - 150)
  c.font = '500 32px Onest, sans-serif'
  c.fillStyle = color
  c.fillText(`${o.companion.name} · ${o.xp} XP · ${o.words} слов`, 95, H - 95)
  c.textAlign = 'right'
  c.font = '900 110px "Noto Serif SC", serif'
  c.fillText('加油', W - 90, H - 100)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('card render failed')
  return URL.createObjectURL(blob)
}
