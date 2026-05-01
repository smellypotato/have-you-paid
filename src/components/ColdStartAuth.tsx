import { useState } from 'react'
import { formatErrorMessage } from '../lib/errors'
import {
  clearJoinIntentForConfirmation,
  storeJoinIntentForConfirmation,
} from '../lib/authJoinIntent'
import { supabase } from '../lib/supabaseClient'

export type AuthIntent = { kind: 'home' } | { kind: 'join'; sessionId: string }

type Props = {
  intent: AuthIntent
  title?: string
  subtitle?: string
}

type Phase = 'menu' | 'login' | 'signup'

export function ColdStartAuth({ intent, title, subtitle }: Props) {
  const [phase, setPhase] = useState<Phase>('menu')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError(null)
    setNotice(null)
  }

  const goMenu = () => {
    resetForm()
    setPhase('menu')
  }

  const continueAnonymous = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { error: e } = await supabase.auth.signInAnonymously()
      if (e) {
        setError(
          `${e.message} — Enable Anonymous sign-ins in Supabase Auth settings if you haven’t yet.`,
        )
        return
      }
    } catch (err: unknown) {
      setError(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const login = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (e) {
        setError(e.message)
        return
      }
    } catch (err: unknown) {
      setError(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const signup = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (intent.kind === 'join') {
        storeJoinIntentForConfirmation(intent.sessionId)
      }
      const { data, error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (e) {
        if (intent.kind === 'join') clearJoinIntentForConfirmation()
        const msg = e.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setError('That email is already registered. Try logging in instead.')
        } else {
          setError(e.message)
        }
        return
      }
      if (data.session) {
        if (intent.kind === 'join') clearJoinIntentForConfirmation()
        return
      }
      setNotice(
        'Check your email to confirm your account. After you confirm, you’ll be signed in and we’ll take you to the bill.',
      )
    } catch (err: unknown) {
      if (intent.kind === 'join') clearJoinIntentForConfirmation()
      setError(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const heading =
    title ??
    (intent.kind === 'join' ? 'Join this bill' : 'Sign in to continue')
  const sub =
    subtitle ??
    (intent.kind === 'join'
      ? 'Choose how you want to continue. You’ll be added to the session next.'
      : 'Log in, create an account, or continue without signing up.')

  return (
    <div className="appShell stack">
      <header>
        <h1 className="h1">{heading}</h1>
        <p className="muted">{sub}</p>
      </header>

      <section className="card stack">
        {phase === 'menu' ? (
          <>
            <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={busy}
                onClick={() => {
                  resetForm()
                  setPhase('login')
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={busy}
                onClick={() => {
                  resetForm()
                  setPhase('signup')
                }}
              >
                Sign up with email
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void continueAnonymous()}>
                {busy ? 'Working…' : 'Continue without account'}
              </button>
            </div>
            <p className="muted">
              “Continue without account” creates a temporary anonymous profile. You can add an email later from the top
              bar.
            </p>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={busy} onClick={goMenu}>
              ← Back
            </button>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span className="muted">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span className="muted">Password</span>
              <input
                type="password"
                autoComplete={phase === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn btnPrimary"
                disabled={busy || !email.trim() || !password}
                onClick={() => void (phase === 'login' ? login() : signup())}
              >
                {busy ? 'Working…' : phase === 'login' ? 'Log in' : 'Create account'}
              </button>
            </div>
          </>
        )}

        {notice ? <p className="muted">{notice}</p> : null}
        {error ? <div className="alert">{error}</div> : null}
      </section>
    </div>
  )
}
