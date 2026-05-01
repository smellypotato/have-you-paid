import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/** Restores session from persisted storage only; does not create an anonymous session. */
export async function restoreStoredSession(): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { session: null, error: error.message }
  }
  return { session: data.session ?? null, error: null }
}
