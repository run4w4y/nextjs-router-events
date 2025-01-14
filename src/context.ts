'use client'

import React, { useContext } from 'react'
import { noop } from './util'

let requests: string[] = []

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
      requests = [...requests, sourceId]
      setFreezeRequests(requests)
    },
    revoke: (sourceId: string) => {
      requests = requests.filter((x) => x !== sourceId)
      setFreezeRequests(requests)
    },
  }
}
