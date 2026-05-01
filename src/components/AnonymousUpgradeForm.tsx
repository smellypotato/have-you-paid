import { useState } from 'react'
import { formatErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabaseClient'

type Props = {
  /** Called after a successful anonymous → email/password upgrade (same user id). */
  onDone: () => void
}

export function AnonymousUpgradeForm({ onDone }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const trimmed = email.trim()
      const { error: e } = await supabase.auth.updateUser({ email: trimmed, password })
      if (e) {
        const msg = e.message.toLowerCase()
        if (msg.includes('already registered')) {
          setError('That email is already in use. Log out and use Log in instead (your anonymous data stays on this device only).')
        } else {
          setError(e.message)
        }
        return
      }
      setNotice(
        'Account linked. If your project requires email confirmation, finish from your inbox—you’ll stay signed in with the same identity.',
      )
    } catch (err: unknown) {
      setError(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const showForm = !notice

  return (
    <div className="card stack" style={{ marginTop: '0.5rem', maxWidth: '22rem', padding: '0.75rem', position: 'fixed', top: '44px', right: '8px' }}>
      <p className="muted" style={{ margin: 0 }}>
        Keeps your current sessions and claims on this identity.
      </p>
      {showForm ? (
        <>
          <label className="stack" style={{ gap: '0.25rem' }}>
            <span className="muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={busy}
            />
          </label>
          <label className="stack" style={{ gap: '0.25rem' }}>
            <span className="muted">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={busy}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn btnPrimary"
              disabled={busy || !email.trim() || !password}
              onClick={() => void submit()}
            >
              {busy ? 'Saving…' : 'Save account'}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => onDone()}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">{notice}</p>
          <button type="button" className="btn btnPrimary" onClick={() => onDone()}>
            Done
          </button>
        </>
      )}
      {error ? <div className="alert">{error}</div> : null}
    </div>
  )
}
