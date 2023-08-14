'use client'

import React, { useContext } from 'react'
import { noop } from './util'

interface FreezeRequestsContextValue {
  freezeRequests: string[]
  setFreezeRequests: React.Dispatch<React.SetStateAction<string[]>>
}

export const FreezeRequestsContext = React.createContext<FreezeRequestsContextValue>({
  freezeRequests: [],
  setFreezeRequests: noop,
})

export const useFreezeRequestsContext = () => {
  const { freezeRequests, setFreezeRequests } = useContext(FreezeRequestsContext)

  return {
    freezeRequests,
    request: (sourceId: string) => {
      setFreezeRequests([...freezeRequests, sourceId])
    },
    revoke: (sourceId: string) => {
      setFreezeRequests(freezeRequests.filter((x) => x !== sourceId))
    },
  }
}
