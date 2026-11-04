const MARKS: Record<string, [string, number]> = {}
const TABLE: Record<string, string> = {
  a: 'āáǎà',
  e: 'ēéěè',
  i: 'īíǐì',
  o: 'ōóǒò',
  u: 'ūúǔù',
  ü: 'ǖǘǚǜ',
}
for (const [base, marked] of Object.entries(TABLE)) {
  Array.from(marked).forEach((m, i) => (MARKS[m] = [base, i + 1]))
}

export function toneOf(syllable: string): number {
  for (const ch of syllable.toLowerCase()) if (MARKS[ch]) return MARKS[ch][1]
  return 5
}

export function stripTones(pinyin: string): string {
  return Array.from(pinyin)
    .map((ch) => {
      const lower = ch.toLowerCase()
      const m = MARKS[lower]
      if (!m) return ch
      return ch === lower ? m[0] : m[0].toUpperCase()
    })
    .join('')
}

export function applyTone(syllable: string, tone: number): string {
  const base = stripTones(syllable)
  if (tone === 5) return base
  const lower = base.toLowerCase()
  let idx = -1
  if (lower.includes('a')) idx = lower.indexOf('a')
  else if (lower.includes('e')) idx = lower.indexOf('e')
  else if (lower.includes('ou')) idx = lower.indexOf('o')
  else {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iouü'.includes(lower[i])) {
        idx = i
        break
      }
    }
  }
  if (idx < 0) return base
  const v = lower[idx]
  const marked = TABLE[v]?.[tone - 1]
  if (!marked) return base
  const out = base[idx] === v ? marked : marked.toUpperCase()
  return base.slice(0, idx) + out + base.slice(idx + 1)
}

export const TONE_INFO = [
  { n: 1, name: 'Первый', short: 'ровный', desc: 'Высокий и ровный, как долгая нота «ааа».', path: 'M10 18 L90 18', color: '#3d7bf7' },
  { n: 2, name: 'Второй', short: 'восходящий', desc: 'Поднимается снизу вверх, как удивлённое «а?»', path: 'M10 62 L90 18', color: '#22a06b' },
  { n: 3, name: 'Третий', short: 'нисходяще-восходящий', desc: 'Опускается вниз и поднимается, как «ну-у?»', path: 'M10 42 Q 40 88 90 22', color: '#f2b33d' },
  { n: 4, name: 'Четвёртый', short: 'падающий', desc: 'Резко падает сверху вниз, как команда «стоп!»', path: 'M10 14 L90 76', color: '#e63b2e' },
]

export const toneColor = (t: number) => TONE_INFO[t - 1]?.color ?? '#6b665e'
