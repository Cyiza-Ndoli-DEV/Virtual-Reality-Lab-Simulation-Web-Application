'use client'

import { createContext, useContext } from 'react'

const ExperimentLabRefreshContext = createContext<(() => void) | null>(null)

export function ExperimentLabRefreshProvider({
  refresh,
  children,
}: {
  refresh: () => void
  children: React.ReactNode
}) {
  return (
    <ExperimentLabRefreshContext.Provider value={refresh}>
      {children}
    </ExperimentLabRefreshContext.Provider>
  )
}

export function useExperimentLabRefresh() {
  return useContext(ExperimentLabRefreshContext)
}
