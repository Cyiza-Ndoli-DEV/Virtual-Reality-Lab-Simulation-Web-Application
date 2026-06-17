'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ChangePasswordDialog } from './change-password-dialog'

type ChangePasswordContextValue = {
  openChangePassword: () => void
}

const ChangePasswordContext = createContext<ChangePasswordContextValue | null>(
  null
)

export function ChangePasswordProvider({
  children,
  portalHome,
}: {
  children: React.ReactNode
  portalHome: string
}) {
  const { data: session } = useSession()
  const forced = Boolean(session?.user?.mustChangePassword)
  const [voluntaryOpen, setVoluntaryOpen] = useState(false)

  const open = forced || voluntaryOpen

  const openChangePassword = useCallback(() => {
    setVoluntaryOpen(true)
  }, [])

  function handleOpenChange(next: boolean) {
    if (forced) return
    setVoluntaryOpen(next)
  }

  const value = useMemo(
    () => ({ openChangePassword }),
    [openChangePassword]
  )

  return (
    <ChangePasswordContext.Provider value={value}>
      {children}
      <ChangePasswordDialog
        open={open}
        onOpenChange={handleOpenChange}
        forced={forced}
        portalHome={portalHome}
        onSuccess={() => setVoluntaryOpen(false)}
      />
    </ChangePasswordContext.Provider>
  )
}

export function useChangePasswordDialog() {
  const ctx = useContext(ChangePasswordContext)
  return ctx?.openChangePassword ?? null
}
