import { supabase } from './supabaseClient'

/** After signing out an email/password user, establish a fresh anonymous session. */
export async function logoutEmailToAnonymous(): Promise<{ error: string | null }> {
  await supabase.auth.signOut({ scope: 'local' })
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    return {
      error:
        error.message +
        ' — You are signed out. Enable Anonymous sign-ins to continue without an email, or sign in again.',
    }
  }
  return { error: null }
}
