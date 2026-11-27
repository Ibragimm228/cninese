import { useEffect, useState } from 'react'
import { SESSION_EVENT, session, signIn, signOut, syncAvailable } from '../lib/sync'
import { Button } from './Button'

const ERRORS: Record<string, string> = {
  'this name is taken': 'Это имя занято',
  'wrong name or password': 'Неверное имя или пароль',
  'name must be 2 to 24 characters': 'Имя: от 2 до 24 символов',
  'password must be 6 to 128 characters': 'Пароль: от 6 символов',
}

/** Sign-in for syncing progress between devices; hidden when the site has no server. */
export function AccountCard() {
  const [me, setMe] = useState(session)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => setMe(session())
    window.addEventListener(SESSION_EVENT, refresh)
    return () => window.removeEventListener(SESSION_EVENT, refresh)
  }, [])
  if (!syncAvailable) return null

  const submit = async (mode: 'login' | 'register') => {
    setBusy(true)
    setError('')
    try {
      await signIn(mode, name, password)
      setPassword('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(ERRORS[msg] ?? 'Сервер недоступен')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl border-2 border-paper-3 bg-card p-6" aria-labelledby="account-heading">
      <h2 id="account-heading" className="font-display text-xl font-bold">Аккаунт</h2>
      {me ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft"><strong className="text-ink">{me.name}</strong> · прогресс синхронизируется</p>
          <Button variant="paper" onClick={() => void signOut()}>Выйти</Button>
        </div>
      ) : (
        <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); void submit('login') }}>
          <input className="rounded-2xl border-2 border-paper-3 bg-paper px-4 py-3" placeholder="Имя" aria-label="Имя" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-2xl border-2 border-paper-3 bg-paper px-4 py-3" placeholder="Пароль" aria-label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="sky" disabled={busy}>Войти</Button>
          <Button type="button" variant="paper" disabled={busy} onClick={() => void submit('register')}>Создать</Button>
          {error && <p className="font-semibold text-wrong-dark sm:col-span-4" role="alert">{error}</p>}
        </form>
      )}
    </section>
  )
}
