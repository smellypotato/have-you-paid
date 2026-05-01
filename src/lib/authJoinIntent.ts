const JOIN_INTENT_KEY = 'have_you_paid_auth_join_intent'

export type StoredJoinIntent = { sessionId: string }

/** Persist join target when sign-up requires email confirmation (no immediate session). */
export function storeJoinIntentForConfirmation(sessionId: string) {
  try {
    const payload: StoredJoinIntent = { sessionId }
    sessionStorage.setItem(JOIN_INTENT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function readJoinIntentForConfirmation(): StoredJoinIntent | null {
  try {
    const raw = sessionStorage.getItem(JOIN_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'sessionId' in parsed &&
      typeof (parsed as { sessionId: unknown }).sessionId === 'string'
    ) {
      return { sessionId: (parsed as StoredJoinIntent).sessionId }
    }
    return null
  } catch {
    return null
  }
}

export function clearJoinIntentForConfirmation() {
  try {
    sessionStorage.removeItem(JOIN_INTENT_KEY)
  } catch {
    /* ignore */
  }
}
