import { addDays, dayKey } from './date'
import { useApp } from './store'

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
const KEY = 'moli-session'
const BASE = 'moli-sync-base'
const STALE = 'progress changed on another device'
/** Fired on `window` when someone signs in or out. */
export const SESSION_EVENT = 'moli-session'

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

let timer: ReturnType<typeof setTimeout> | undefined

export async function push(): Promise<void> {
  if (!API || !session()) return
  try {
    const body = { state: snapshot(), week: weekKeys(), base: Number(localStorage.getItem(BASE) ?? 0) }
    const { updatedAt } = await call<{ updatedAt: number }>('/api/progress', { method: 'PUT', body: JSON.stringify(body) })
    localStorage.setItem(BASE, String(updatedAt))
  } catch (e) {
    // another device saved first: catch up with it instead of overwriting its lessons
    if (e instanceof Error && e.message === STALE) await pull()
    else throw e
  }
}

/** Takes the server copy unless this device is further along (a tie goes to the server), otherwise uploads this one. */
export async function pull(): Promise<void> {
  if (!API || !session()) return
  const { state, updatedAt } = await call<{ state: (Record<string, unknown> & { xp?: number }) | null; updatedAt: number }>('/api/progress')
  localStorage.setItem(BASE, String(updatedAt))
  if (state && (state.xp ?? 0) >= useApp.getState().xp) useApp.setState({ ...state, theme: useApp.getState().theme })
  else await push()
}

export async function signIn(mode: 'login' | 'register', name: string, password: string): Promise<Session> {
  const s = await call<Session>(`/api/${mode}`, { method: 'POST', body: JSON.stringify({ name, password }) })
  localStorage.setItem(KEY, JSON.stringify(s))
  await pull()
  window.dispatchEvent(new Event(SESSION_EVENT))
  return s
}

export async function signOut(): Promise<void> {
  clearTimeout(timer)
  // save what has not been uploaded yet, because the local copy is cleared below
  await push().catch(() => {})
  await call('/api/logout', { method: 'POST' }).catch(() => {})
  localStorage.removeItem(KEY)
  localStorage.removeItem(BASE)
  // the account's progress stays on the server and must not be left for the next person on this browser
  const { theme, reset } = useApp.getState()
  reset()
  useApp.setState({ theme })
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export function leagueTable(): Promise<LeagueRow[]> {
  return call<LeagueRow[]>(`/api/league?week=${weekKeys()[0]}`)
}

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
