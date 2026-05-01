import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'

type Patch = { userId: string; name: string } | null

type PatchContextValue = {
  patch: Patch
  /** Call after profile display_name is persisted so the shell header updates without refetch latency. */
  commitDisplayNamePatch: (userId: string, displayName: string) => void
}

const ProfileDisplayPatchContext = createContext<PatchContextValue | null>(null)

export function ProfileDisplayPatchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [patch, setPatch] = useState<Patch>(null)

  useEffect(() => {
    setPatch(null)
  }, [user?.id])

  const commitDisplayNamePatch = useCallback((userId: string, displayName: string) => {
    setPatch({ userId, name: displayName.trim() || 'Guest' })
  }, [])

  const value = useMemo(
    () => ({ patch, commitDisplayNamePatch }),
    [patch, commitDisplayNamePatch],
  )

  return (
    <ProfileDisplayPatchContext.Provider value={value}>{children}</ProfileDisplayPatchContext.Provider>
  )
}

export function useProfileDisplayPatchContext(): PatchContextValue | null {
  return useContext(ProfileDisplayPatchContext)
}

/** Returns the banner commit helper; Provider must wrap the router. */
export function useCommitDisplayNamePatch() {
  const ctx = useContext(ProfileDisplayPatchContext)
  if (!ctx) {
    throw new Error('ProfileDisplayPatchProvider is required for useCommitDisplayNamePatch')
  }
  return ctx.commitDisplayNamePatch
}
