import { allSentences, allWords, sentenceById, tokenWord, units, unitOfWord, wordById } from '../data/curriculum'
import type { Lesson, Sentence, Word } from '../data/types'
import { applyTone, stripTones, toneOf } from './pinyin'
import { wordsBeforeLesson } from './progress'

export type Exercise = { key: string } & (
  | { type: 'intro'; word: Word }
  | { type: 'choice'; word: Word; options: Word[]; direction: 'zh-ru' | 'ru-zh' }
  | { type: 'listen'; word: Word; options: Word[] }
  | { type: 'match'; words: Word[] }
  | { type: 'tone'; word: Word; options: string[] }
  | { type: 'build'; sentence: Sentence; direction: 'ru-zh' | 'zh-ru' | 'listen'; tiles: string[]; answer: string[] }
  | { type: 'fill'; sentence: Sentence; blank: number; options: Word[] }
  | { type: 'write'; word: Word }
)

export type ExerciseType = Exercise['type']

let keySeq = 0
const k = (p: string) => `${p}-${++keySeq}`

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const sample = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n)

export const ruWords = (ru: string) =>
  ru
    .replace(/[.,!?;:«»"]/g, '')
    .split(/\s+/)
    .filter(Boolean)

function conflicts(a: Word, b: Word) {
  return (
    a.id === b.id ||
    a.hanzi === b.hanzi ||
    a.ru === b.ru ||
    stripTones(a.pinyin).toLowerCase() === stripTones(b.pinyin).toLowerCase()
  )
}

function distractors(word: Word, n: number, pool: Word[] = allWords): Word[] {
  const sameUnit = unitOfWord.get(word.id)?.words ?? []
  const candidates = [...new Set([...shuffle(pool), ...shuffle(sameUnit), ...shuffle(allWords)])]
  const out: Word[] = []
  for (const c of candidates) {
    if (out.length >= n) break
    if (conflicts(c, word) || out.some((o) => conflicts(o, c))) continue
    out.push(c)
  }
  return out
}

export const isSingleSyllable = (w: Word) => Array.from(w.hanzi).length === 1 && !w.pinyin.includes(' ')

function choice(word: Word, direction: 'zh-ru' | 'ru-zh', pool?: Word[]): Exercise {
  return { key: k('choice'), type: 'choice', word, direction, options: shuffle([word, ...distractors(word, 3, pool)]) }
}

function listen(word: Word, pool?: Word[]): Exercise {
  return { key: k('listen'), type: 'listen', word, options: shuffle([word, ...distractors(word, 3, pool)]) }
}

function tone(word: Word): Exercise {
  const t = toneOf(word.pinyin)
  const tones = t === 5 ? [5, 1, 2, 4] : [1, 2, 3, 4]
  return { key: k('tone'), type: 'tone', word, options: tones.map((n) => applyTone(word.pinyin, n)) }
}

function match(words: Word[]): Exercise {
  const uniq: Word[] = []
  for (const w of words) if (!uniq.some((u) => conflicts(u, w))) uniq.push(w)
  return { key: k('match'), type: 'match', words: uniq.slice(0, 5) }
}

function build(sentence: Sentence, direction: 'ru-zh' | 'zh-ru' | 'listen'): Exercise {
  if (direction === 'zh-ru') {
    const answer = ruWords(sentence.ru)
    const lowerAnswer = new Set(answer.map((w) => w.toLowerCase()))
    const others = shuffle(allSentences.filter((s) => s.id !== sentence.id).flatMap((s) => ruWords(s.ru)))
    const extra: string[] = []
    for (const w of others) {
      if (extra.length >= 3) break
      const lw = w.toLowerCase()
      if (!lowerAnswer.has(lw) && !extra.some((e) => e.toLowerCase() === lw)) extra.push(lw)
    }
    return { key: k('build'), type: 'build', sentence, direction, answer, tiles: shuffle([...answer, ...extra]) }
  }
  const answer = sentence.tokens
  const used = new Set(answer)
  const extra = sample(
    allWords.filter((w) => !used.has(w.hanzi) && Array.from(w.hanzi).length <= 2),
    direction === 'listen' ? 2 : 3,
  ).map((w) => w.hanzi)
  return { key: k('build'), type: 'build', sentence, direction, answer, tiles: shuffle([...answer, ...extra]) }
}

function fill(sentence: Sentence): Exercise | null {
  if (sentence.tokens.length < 2) return null
  const candidates = sentence.tokens.map((t, i) => [t, i] as const).filter(([t]) => (tokenWord(t)?.ru.length ?? 0) > 0)
  const [token, blank] = candidates[Math.floor(Math.random() * candidates.length)]
  const word = tokenWord(token)!
  const opts = distractors(word, 3).filter((d) => !sentence.tokens.includes(d.hanzi))
  return { key: k('fill'), type: 'fill', sentence, blank, options: shuffle([word, ...opts]) }
}

function write(word: Word): Exercise {
  return { key: k('write'), type: 'write', word }
}

export type GenOptions = { voice: boolean }

export function exerciseWordIds(ex: Exercise): string[] {
  switch (ex.type) {
    case 'match':
      return ex.words.map((w) => w.id)
    case 'build':
    case 'fill':
      return ex.sentence.tokens.map((t) => tokenWord(t)?.id).filter((x): x is string => !!x)
    default:
      return [ex.word.id]
  }
}

export function generateLesson(lesson: Lesson, opts: GenOptions): Exercise[] {
  const unit = units.find((u) => u.id === lesson.unitId)!
  const prev = wordsBeforeLesson(lesson)
  const sentences = lesson.sentenceIds.map((id) => sentenceById.get(id)!)
  const out: Exercise[] = []

  if (lesson.kind === 'learn') {
    const fresh = lesson.newWordIds.map((id) => wordById.get(id)!)
    const pool = [...fresh, ...prev.slice(-12)]
    fresh.forEach((w, i) => {
      out.push({ key: k('intro'), type: 'intro', word: w })
      out.push(choice(w, i % 2 ? 'ru-zh' : 'zh-ru', pool))
    })
    const reviewWords = sample(prev, 2)
    for (const w of reviewWords) out.push(opts.voice ? listen(w, pool) : choice(w, 'ru-zh', pool))
    for (const w of sample(fresh, 2)) out.push(opts.voice ? listen(w, pool) : choice(w, 'zh-ru', pool))
    out.push(match([...fresh, ...sample(prev, 2)]))
    const single = fresh.filter(isSingleSyllable)
    if (single.length) {
      out.push(tone(single[0]))
      out.push(write(single[single.length > 1 ? 1 : 0]))
    }
    for (const w of sample(fresh, 1)) out.push(choice(w, 'ru-zh', pool))
    sentences.slice(0, 2).forEach((s, i) => out.push(build(s, i % 2 ? 'zh-ru' : 'ru-zh')))
    if (sentences.length > 2) {
      const f = fill(sentences[2])
      if (f) out.push(f)
    }
    return [...out.slice(0, fresh.length * 2), ...shuffle(out.slice(fresh.length * 2))]
  }

  const words = unit.words
  if (lesson.kind === 'review') {
    out.push(match(sample(words, 5)))
    for (const w of sample(words, 4)) out.push(choice(w, Math.random() > 0.5 ? 'zh-ru' : 'ru-zh', words))
    for (const w of sample(words, 2)) out.push(opts.voice ? listen(w, words) : choice(w, 'zh-ru', words))
    for (const w of sample(words.filter(isSingleSyllable), 2)) out.push(tone(w))
    sample(sentences, 3).forEach((s, i) => out.push(build(s, i % 2 ? 'zh-ru' : 'ru-zh')))
    for (const s of sample(sentences, 2)) {
      const f = fill(s)
      if (f) out.push(f)
    }
    out.push(match(sample(words, 5)))
    return [out[0], ...shuffle(out.slice(1))]
  }

  for (const w of sample(words, 3)) out.push(choice(w, 'ru-zh', words))
  for (const w of sample(words, 2)) out.push(opts.voice ? listen(w, words) : choice(w, 'zh-ru', words))
  for (const w of sample(words.filter(isSingleSyllable), 2)) out.push(write(w))
  for (const w of sample(words.filter(isSingleSyllable), 1)) out.push(tone(w))
  sample(sentences, 5).forEach((s, i) => out.push(build(s, opts.voice && i === 4 ? 'listen' : i % 2 ? 'zh-ru' : 'ru-zh')))
  for (const s of sample(sentences, 2)) {
    const f = fill(s)
    if (f) out.push(f)
  }
  out.push(match(sample(words, 5)))
  return shuffle(out)
}

export type PracticeMode = 'review' | 'mistakes' | 'listening' | 'writing' | 'sentences'

export function generatePractice(mode: PracticeMode, words: Word[], opts: GenOptions): Exercise[] {
  const base = words.length >= 4 ? words : allWords.slice(0, 12)
  const pick = sample(base, 10)
  const out: Exercise[] = []
  const knownHanzi = new Set(base.map((w) => w.hanzi))
  const sentences = allSentences.filter((s) => s.tokens.every((t) => knownHanzi.has(t)))
  switch (mode) {
    case 'listening':
      if (!opts.voice) return generatePractice('review', words, opts)
      for (const w of pick.slice(0, 8)) out.push(listen(w, base))
      for (const s of sample(sentences, 3)) out.push(build(s, 'listen'))
      return shuffle(out)
    case 'writing': {
      const singles = base.filter(isSingleSyllable)
      for (const w of sample(singles.length ? singles : allWords.filter(isSingleSyllable), 8)) out.push(write(w))
      return out
    }
    case 'sentences': {
      const ss = sentences.length >= 3 ? sentences : allSentences.slice(0, 8)
      sample(ss, 8).forEach((s, i) => out.push(build(s, i % 3 === 2 && opts.voice ? 'listen' : i % 2 ? 'zh-ru' : 'ru-zh')))
      for (const s of sample(ss, 3)) {
        const f = fill(s)
        if (f) out.push(f)
      }
      return shuffle(out)
    }
    default: {
      pick.forEach((w, i) => {
        if (i % 3 === 0 && opts.voice) out.push(listen(w, base))
        else out.push(choice(w, i % 2 ? 'ru-zh' : 'zh-ru', base))
      })
      for (const w of pick.filter(isSingleSyllable).slice(0, 2)) out.push(tone(w))
      out.push(match(pick.slice(0, 5)))
      if (pick.length > 5) out.push(match(pick.slice(5, 10)))
      for (const s of sample(sentences, 2)) out.push(build(s, 'ru-zh'))
      return shuffle(out)
    }
  }
}
