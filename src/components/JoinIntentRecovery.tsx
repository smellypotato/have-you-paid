import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  clearJoinIntentForConfirmation,
  readJoinIntentForConfirmation,
} from '../lib/authJoinIntent'
import { isUuid } from '../lib/uuid'

/** After email confirmation, resume pending join if we stored intent during sign-up. */
export function JoinIntentRecovery() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!ready || !user) return
    const pending = readJoinIntentForConfirmation()
    if (!pending || !isUuid(pending.sessionId)) return
    clearJoinIntentForConfirmation()
    navigate(`/join/${pending.sessionId}`, { replace: true })
  }, [user, ready, navigate])

  return null
}
