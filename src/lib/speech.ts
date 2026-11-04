let voices: SpeechSynthesisVoice[] = []
const listeners = new Set<() => void>()

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  voices = window.speechSynthesis.getVoices()
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

function chineseVoice(): SpeechSynthesisVoice | undefined {
  const zh = voices.filter((v) => /^zh[-_]?(CN|Hans)?/i.test(v.lang) && !/HK|TW|yue/i.test(v.lang))
  return (
    zh.find((v) => /Google/i.test(v.name)) ??
    zh.find((v) => /Xiaoxiao|Yunxi|Tingting|Ting-Ting|Lili/i.test(v.name)) ??
    zh[0] ??
    voices.find((v) => /^zh/i.test(v.lang))
  )
}

export function hasChineseVoice(): boolean {
  return !!chineseVoice()
}

export function onVoicesChanged(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function speak(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    const v = chineseVoice()
    if (v) u.voice = v
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
    setTimeout(resolve, 4000)
  })
}
