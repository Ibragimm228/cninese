import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, ws: false },
  appType: 'custom',
})
after(() => vite.close())
const { allWords, allSentences, hskLevels, lessons, lessonById, sentenceById, tokenWord, units, wordById, wordsByLevel } =
  await vite.ssrLoadModule('/src/data/curriculum.ts')
const { buildExam, examScale, examScore } = await vite.ssrLoadModule('/src/lib/exam.ts')

test('all three HSK lists have distinct entries and working lessons and sentences', () => {
  assert.deepEqual(hskLevels.map((level) => wordsByLevel[level].length), [150, 150, 300])
  const official = hskLevels.flatMap((level) => wordsByLevel[level])
  assert.equal(new Set(official.map((w) => w.id)).size, 600)
  assert.equal(new Set(official.map((w) => [w.hanzi, w.pinyin.replaceAll(' ', ''), w.sense].join('|'))).size, 600)
  assert.equal(wordById.size, allWords.length)
  assert.equal(sentenceById.size, allSentences.length)
  assert.equal(lessonById.size, lessons.length)
  assert.equal(wordById.get('w-jdd').hanzi, '我')
  assert.equal(lessonById.get('u1-l1').unitId, 'u1')
  for (const word of official) {
    assert.ok(word.ru && /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s…'’]+$/iu.test(word.pinyin), word.hanzi + ' ' + word.pinyin)
  }
  for (const unit of units) {
    const track = lessons.filter((lesson) => lesson.unitId === unit.id)
    assert.deepEqual(track.slice(-2).map((l) => l.kind), ['review', 'test'])
    assert.deepEqual(track.flatMap((l) => l.newWordIds), unit.words.map((w) => w.id))
    for (const id of track.flatMap((l) => l.sentenceIds)) assert.ok(sentenceById.has(id), id)
  }
  for (const s of allSentences) {
    for (const token of s.tokens) assert.ok(tokenWord(token), s.id + ': ' + token)
  }
})

test('mock exams have unique choices and level-specific scoring, with writing at HSK 3', () => {
  assert.deepEqual(hskLevels.map((level) => examScale[level].pass), [120, 120, 180])
  for (const level of hskLevels) {
    for (const voice of [false, true]) {
      const questions = buildExam(level, voice)
      assert.equal(questions.filter((q) => q.section === 'listen').length, voice ? 12 : 0)
      assert.equal(questions.filter((q) => q.section === 'read').length, 16)
      assert.equal(questions.filter((q) => q.section === 'write').length, level === 3 ? 6 : 0)
      for (const q of questions) {
        if (q.section === 'write') assert.ok(q.hanzi.includes('＿＿') && q.hint)
        else {
          assert.equal(new Set(q.options).size, 4)
          assert.ok(q.options.includes(q.answer))
        }
      }
      assert.equal(examScore(level, questions, questions.map((q) => q.answer)), examScale[level].max)
      assert.equal(examScore(level, questions, []), 0)
    }
  }
})
