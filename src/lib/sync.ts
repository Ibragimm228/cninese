import { addDays, dayKey } from './date'
import { useApp } from './store'

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const KEY = 'moli-session'

/** Accounts exist only when the site was built with a server address. */
export const syncAvailable = !!API

export type Session = { token: string; name: string }
export type LeagueRow = { name: string; xp: number; me: boolean }

export function session(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function weekKeys(): string[] {
  const d = new Date()
  const start = addDays(dayKey(d), -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const s = session()
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
  })
  if (res.status === 401 && s && !path.startsWith('/api/login')) localStorage.removeItem(KEY)
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `HTTP ${res.status}`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

const snapshot = () => JSON.parse(JSON.stringify(useApp.getState())) as Record<string, unknown>

export async function push(): Promise<void> {
  if (!API || !session()) return
  await call('/api/progress', { method: 'PUT', body: JSON.stringify({ state: snapshot(), week: weekKeys() }) })
}

/** Takes the server copy when it is further along than this device, otherwise uploads this one. */
export async function pull(): Promise<void> {
  if (!API || !session()) return
  const { state } = await call<{ state: (Record<string, unknown> & { xp?: number }) | null }>('/api/progress')
  if (state && (state.xp ?? 0) > useApp.getState().xp) useApp.setState({ ...state, theme: useApp.getState().theme })
  else await push()
}

export async function signIn(mode: 'login' | 'register', name: string, password: string): Promise<Session> {
  const s = await call<Session>(`/api/${mode}`, { method: 'POST', body: JSON.stringify({ name, password }) })
  localStorage.setItem(KEY, JSON.stringify(s))
  await pull()
  return s
}

export async function signOut(): Promise<void> {
  await call('/api/logout', { method: 'POST' }).catch(() => {})
  localStorage.removeItem(KEY)
}

export function leagueTable(): Promise<LeagueRow[]> {
  return call<LeagueRow[]>(`/api/league?week=${weekKeys()[0]}`)
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Uploads progress a moment after it changes, and catches up with the server on start. */
export function startSync() {
  if (!API) return
  void pull().catch(() => {})
  useApp.subscribe((s, prev) => {
    if (!session() || (s.xp === prev.xp && s.words === prev.words && s.lessons === prev.lessons && s.streak === prev.streak)) return
    clearTimeout(timer)
    timer = setTimeout(() => void push().catch(() => {}), 2500)
  })
}
