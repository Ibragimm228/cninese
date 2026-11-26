import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'

const storage = new Map()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  },
})

const { localStorage } = window
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, ws: false },
  appType: 'custom',
})
after(() => vite.close())
const { useApp } = await vite.ssrLoadModule('/src/lib/store.ts')
const { dayKey } = await vite.ssrLoadModule('/src/lib/date.ts')
const { companionFor, companions } = await vite.ssrLoadModule('/src/data/companions.ts')
const get = useApp.getState

test('old saves keep their XP, streak and name and get the default companion', async () => {
  const lastActiveDay = dayKey()
  localStorage.setItem('moli-progress', JSON.stringify({
    version: 1,
    state: { name: 'Ли', streak: 3, xp: 45, lastActiveDay },
  }))
  await useApp.persist.rehydrate()
  assert.equal(get().name, 'Ли')
  assert.equal(get().xp, 45)
  assert.equal(get().streak, 3)
  assert.equal(companionFor(get().companionId), companions[0])
})

test('selection persists independently and uses the existing lesson streak', async () => {
  get().reset()
  get().setCompanion('ichigo')
  const saved = localStorage.getItem('moli-progress')
  get().setCompanion('kuroko')
  localStorage.setItem('moli-progress', saved)
  await useApp.persist.rehydrate()
  assert.equal(get().companionId, 'ichigo')
  assert.equal(get().streak, 0)

  const result = { xp: 15, correct: 3, total: 3, seconds: 20 }
  const first = get().completeLesson(result)
  assert.equal(first.streakExtended, true)
  assert.equal(first.streak, 1)
  const second = get().completeLesson(result)
  assert.equal(second.streakExtended, false)
  assert.equal(second.streak, 1)
  assert.equal(second.goalReached, true)
  assert.equal(get().companionId, 'ichigo')
})
