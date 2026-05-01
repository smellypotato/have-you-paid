import type { User } from '@supabase/supabase-js'

/** True when signed in via Supabase anonymous sign-in (JWT includes `is_anonymous`). */
export function isAnonymousUser(user: User | null | undefined): boolean {
  if (!user) return false
  return user.is_anonymous === true
}
