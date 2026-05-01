import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useProfileDisplayPatchContext } from './profileDisplayPatch'

export function useDisplayName(userId: string | undefined) {
  const patchCtx = useProfileDisplayPatchContext()
  const [remoteName, setRemoteName] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setRemoteName(null)
      return
    }
    void (async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle()
      setRemoteName(data?.display_name?.trim() || 'Guest')
    })()
  }, [userId])

  const patched =
    userId && patchCtx?.patch && patchCtx.patch.userId === userId ? patchCtx.patch.name : null

  return patched ?? remoteName
}
