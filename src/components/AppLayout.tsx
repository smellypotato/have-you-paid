import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { AnonymousUpgradeForm } from './AnonymousUpgradeForm'
import { useAuth } from '../lib/auth'
import { isAnonymousUser } from '../lib/authUser'
import { formatErrorMessage } from '../lib/errors'
import { logoutEmailToAnonymous } from '../lib/logoutToAnonymous'
import { useDisplayName } from '../lib/useDisplayName'

export function AppLayout() {
  const { user, ready } = useAuth()
  const displayName = useDisplayName(user?.id)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [logoutErr, setLogoutErr] = useState<string | null>(null)

  const onLogout = async () => {
    setLogoutErr(null)
    setLogoutBusy(true)
    try {
      const { error } = await logoutEmailToAnonymous()
      if (error) setLogoutErr(error)
      setShowUpgrade(false)
    } catch (e: unknown) {
      setLogoutErr(formatErrorMessage(e))
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <div className="appRoot">
      <header className="appTopBar">
        <span className="appTopBarSpacer" />
        {ready && user ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div className="userBadgeRow">
              <span className="userBadge" title="Your display name">
                {displayName ?? '…'}
              </span>
              <span className="muted userBadgeHint">
                {isAnonymousUser(user) ? (
                  <>You’re using a temporary account.</>
                ) : (
                  <>
                    Change your name on the <Link to="/">home page</Link>.
                  </>
                )}
              </span>
              {isAnonymousUser(user) ? (
                <button type="button" className="btn" onClick={() => setShowUpgrade((v) => !v)}>
                  {showUpgrade ? 'Close' : 'Create account'}
                </button>
              ) : (
                <button type="button" className="btn" disabled={logoutBusy} onClick={() => void onLogout()}>
                  {logoutBusy ? 'Working…' : 'Log out'}
                </button>
              )}
            </div>
            {showUpgrade && isAnonymousUser(user) ? (
              <AnonymousUpgradeForm onDone={() => setShowUpgrade(false)} />
            ) : null}
            {logoutErr ? (
              <div className="alert" style={{ maxWidth: 'min(520px, 100%)', margin: 0 }}>
                {logoutErr}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
