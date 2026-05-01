import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ColdStartAuth } from '../components/ColdStartAuth'
import { useAuth } from '../lib/auth'
import { isMutationPostgresDup, mutationParticipantJoinGuest } from '../api/databaseMutations'
import { formatErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabaseClient'
import { isUuid } from '../lib/uuid'

export function JoinPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, ready, error: authError } = useAuth()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !user || !sessionId) return

    void (async () => {
      if (!isUuid(sessionId)) {
        setMessage('Invalid session link.')
        return
      }

      // If this user is already in the session (e.g. host or guest; session may be locked),
      // the join link should open the bill like Home → Open — not run "new guest" join rules.
      const { data: alreadyIn } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (alreadyIn) {
        navigate(`/session/${sessionId}`, { replace: true })
        return
      }

      const { data: preview, error: previewErr } = await supabase.rpc('get_session_join_preview', {
        p_session_id: sessionId,
      })
      if (previewErr) {
        setMessage(formatErrorMessage(previewErr))
        return
      }
      if (!preview?.length) {
        setMessage('This bill was not found, or joining is closed (session locked).')
        return
      }

      try {
        await mutationParticipantJoinGuest(supabase, { session_id: sessionId })
      } catch (pe: unknown) {
        if (isMutationPostgresDup(pe)) {
          navigate(`/session/${sessionId}`, { replace: true })
          return
        }
        const msg = formatErrorMessage(pe)
        if (msg.includes('Guest limit reached')) {
          setMessage('This bill has reached its guest limit. Ask the host to raise the limit or make room.')
          return
        }
        setMessage(msg)
        return
      }
      navigate(`/session/${sessionId}`, { replace: true })
    })()
  }, [ready, user, sessionId, navigate])

  if (!ready) {
    return (
      <div className="appShell">
        <p className="muted">Joining…</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="appShell">
        <div className="alert">{authError}</div>
      </div>
    )
  }

  if (!user) {
    if (!sessionId || !isUuid(sessionId)) {
      return (
        <div className="appShell stack">
          <div className="alert">Invalid session link.</div>
          <Link to="/">Home</Link>
        </div>
      )
    }
    return <ColdStartAuth intent={{ kind: 'join', sessionId }} />
  }

  return (
    <div className="appShell stack">
      <h1 className="h1">Join session</h1>
      {message ? <div className="alert">{message}</div> : <p className="muted">Adding you to the bill…</p>}
    </div>
  )
}
