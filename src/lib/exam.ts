import { hskLevels, units, wordByHanzi, wordsByLevel } from '../data/curriculum'
import type { HskLevel } from '../data/types'

type ChoiceQuestion = { section: 'listen' | 'read'; prompt: string; audio?: string; hanzi?: string; options: string[]; answer: string }
type WritingQuestion = { section: 'write'; prompt: string; hanzi: string; hint: string; answer: string }
export type ExamQuestion = ChoiceQuestion | WritingQuestion

export const examScale = {
  1: { max: 200, pass: 120 },
  2: { max: 200, pass: 120 },
  3: { max: 300, pass: 180 },
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const pick = <T,>(items: readonly T[], count: number) => shuffle(items).slice(0, count)

export function examVocabulary(level: HskLevel) {
  return hskLevels.filter((l) => l <= level).flatMap((l) => wordsByLevel[l])
}

export function buildExam(level: HskLevel, voice: boolean): ExamQuestion[] {
  const levelWords = wordsByLevel[level]
  const words = examVocabulary(level)
  const sentences = units.filter((u) => u.level === level).flatMap((u) => u.sentences)
  const questions: ExamQuestion[] = []
  const options = (answer: string, pool: string[]) => shuffle([answer, ...pick([...new Set(pool)].filter((x) => x !== answer), 3)])
  const spokenWords = levelWords.filter((w) => (!w.sense || w.audio) && !w.hanzi.includes('…'))
  if (voice) {
    for (const word of pick(spokenWords, 8)) {
      questions.push({
        section: 'listen', prompt: word.audio ? 'Какое слово звучит во фразе?' : 'Прослушай и выбери услышанное слово', audio: word.audio ?? word.hanzi,
        options: options(word.hanzi, words.filter((w) => w.pinyin.replaceAll(' ', '') !== word.pinyin.replaceAll(' ', '') && !w.hanzi.includes('…') && !word.audio?.includes(w.hanzi)).map((w) => w.hanzi)),
        answer: word.hanzi,
      })
    }
    for (const sentence of pick(sentences, 4)) {
      questions.push({
        section: 'listen', prompt: 'Прослушай фразу и выбери перевод', audio: sentence.tokens.join(''),
        options: options(sentence.ru, sentences.map((s) => s.ru)), answer: sentence.ru,
      })
    }
  }
  for (const word of pick(levelWords, 10)) {
    questions.push({
      section: 'read', prompt: word.sense ? `Что означает это слово? (${word.sense}, ${word.pinyin})` : 'Что означает это слово?',
      hanzi: word.hanzi, options: options(word.ru, words.filter((w) => w.hanzi !== word.hanzi).map((w) => w.ru)), answer: word.ru,
    })
  }
  for (const sentence of pick(sentences, 6)) {
    questions.push({
      section: 'read', prompt: 'Прочитай и выбери перевод', hanzi: sentence.tokens.join(''),
      options: options(sentence.ru, sentences.map((s) => s.ru)), answer: sentence.ru,
    })
  }
  if (level === 3) {
    for (const sentence of pick(sentences.filter((s) => s.tokens.some((token) => (wordByHanzi.get(token)?.hanzi.length ?? 0) > 1)), 6)) {
      const eligible = sentence.tokens.flatMap((token, index) => {
        const word = wordByHanzi.get(token)
        return word && word.hanzi.length > 1 ? [{ word, index }] : []
      })
      const entry = pick(eligible, 1)[0]
      if (entry) questions.push({
        section: 'write', prompt: 'Впиши пропущенное слово иероглифами',
        hanzi: sentence.tokens.map((token, index) => index === entry.index ? '＿＿' : token).join(''),
        hint: `${entry.word.pinyin} · ${sentence.ru}`, answer: entry.word.hanzi,
      })
    }
  }
  return questions
}

export function examScore(level: HskLevel, questions: ExamQuestion[], answers: string[]) {
  const sections = [...new Set(questions.map((q) => q.section))]
  const accuracy = sections.reduce((sum, section) => {
    const indices = questions.flatMap((q, index) => q.section === section ? [index] : [])
    return sum + indices.filter((i) => answers[i]?.trim() === questions[i].answer).length / indices.length
  }, 0) / Math.max(1, sections.length)
  return Math.round(accuracy * examScale[level].max)
}
