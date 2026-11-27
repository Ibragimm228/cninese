import { allWords } from '../data/curriculum'
import { stripTones } from './pinyin'

type Recognition = {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

function ctor(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canRecognize = () => !!ctor()

export type Heard = { alternatives: string[]; error?: 'denied' | 'silent' | 'failed' }

/** Listens for one Mandarin phrase. `stop` aborts early. */
export function listenOnce(): { result: Promise<Heard>; stop: () => void } {
  const C = ctor()
  if (!C) return { result: Promise.resolve({ alternatives: [], error: 'failed' }), stop: () => {} }
  const rec = new C()
  rec.lang = 'zh-CN'
  rec.maxAlternatives = 5
  rec.interimResults = false
  const result = new Promise<Heard>((resolve) => {
    let heard: Heard = { alternatives: [], error: 'silent' }
    rec.onresult = (e) => {
      heard = { alternatives: Array.from(e.results[0] ?? []).map((a) => a.transcript) }
    }
    rec.onerror = (e) => {
      heard = { alternatives: [], error: e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' || e.error === 'aborted' ? 'silent' : 'failed' }
    }
    rec.onend = () => resolve(heard)
    try {
      rec.start()
    } catch {
      resolve({ alternatives: [], error: 'failed' })
    }
  })
  return { result, stop: () => rec.abort() }
}

const clean = (s: string) => s.replace(/[\s，。！？、,.!?…~]/g, '')
const flat = (pinyin: string) => stripTones(pinyin).toLowerCase().replace(/[^a-zü]/g, '')

// the recogniser often returns a homophone, so characters the course knows are also compared by sound
const sounds = new Map<string, string>()
for (const w of allWords) {
  const chars = Array.from(w.hanzi)
  const syllables = w.pinyin.split(/\s+/)
  if (chars.length === syllables.length) chars.forEach((c, i) => { if (!sounds.has(c)) sounds.set(c, flat(syllables[i])) })
}

export function matchesSpeech(alternatives: string[], hanzi: string, pinyin: string): boolean {
  const want = clean(hanzi)
  const wantSound = flat(pinyin)
  return alternatives.some((alt) => {
    const got = clean(alt)
    if (!got) return false
    if (got === want) return true
    const sound = Array.from(got).map((c) => sounds.get(c))
    return sound.every((x) => x !== undefined) && sound.join('') === wantSound
  })
}
