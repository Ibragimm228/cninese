import { useApp } from './store'

let ctx: AudioContext | null = null
function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0, c.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

const enabled = () => useApp.getState().settings.sound

export const sfx = {
  correct() {
    if (!enabled()) return
    tone(880, 0, 0.18, 'triangle')
    tone(1318.5, 0.09, 0.32, 'triangle')
  },
  wrong() {
    if (!enabled()) return
    tone(220, 0, 0.22, 'square', 0.07)
    tone(174, 0.12, 0.3, 'square', 0.07)
  },
  tap() {
    if (!enabled()) return
    tone(660, 0, 0.06, 'sine', 0.08)
  },
  complete() {
    if (!enabled()) return
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((n, i) => tone(n, i * 0.09, 0.45, 'triangle', 0.14))
  },
  combo() {
    if (!enabled()) return
    tone(1046.5, 0, 0.12, 'sine', 0.12)
    tone(1568, 0.06, 0.2, 'sine', 0.1)
  },
}
