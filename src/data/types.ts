export type HskLevel = 1 | 2 | 3

export type Word = {
  id: string
  hanzi: string
  pinyin: string
  ru: string
  sense?: string
  audio?: string
  note?: string
}

export type Sentence = {
  id: string
  tokens: string[]
  ru: string
}

export type Unit = {
  id: string
  index: number
  level: HskLevel
  title: string
  subtitle: string
  hanzi: string
  color: string
  shadow: string
  words: Word[]
  sentences: Sentence[]
  tip: { title: string; body: string }
}

export type Lesson = {
  id: string
  unitId: string
  index: number
  title: string
  kind: 'learn' | 'review' | 'test'
  newWordIds: string[]
  sentenceIds: string[]
}
