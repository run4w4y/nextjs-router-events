'use client'

import React, { useContext } from 'react'
import type { MutableRefObject } from 'react'
import type {
  HistoryURL,
  RouteChangeCallbacks,
  RouteChangeDetail,
  RouteChangeSource,
} from './events'

export interface RouteChangeListener {
  callbacksRef: MutableRefObject<RouteChangeCallbacks>
  setPendingDetail: (detail: RouteChangeDetail | null) => void
}

export interface FreezeRequestsContextValue {
  freezeRequests: string[]
  request: (sourceId: string) => void
  revoke: (sourceId: string) => void
  registerListener: (sourceId: string, listener: RouteChangeListener) => void
  unregisterListener: (sourceId: string) => void
  confirmBeforeRouteChange: (detail: RouteChangeDetail) => boolean
  confirmRouteChange: (requestId: string, sourceId: string) => void
  registerPending: (detail: RouteChangeDetail, resume: () => void) => void
  resolvePending: (requestId: string) => void
  beginRouteChange: (detail: RouteChangeDetail) => void
  completeRouteChange: (targetUrl: HistoryURL) => void
  setNextPopstateSource: (source: RouteChangeSource) => void
  consumeNextPopstateSource: () => RouteChangeSource | null
}

export const FreezeRequestsContext = React.createContext<FreezeRequestsContextValue | null>(null)

export const useFreezeRequestsContext = () => {
  const context = useContext(FreezeRequestsContext)

  if (!context)
    throw new Error('nextjs-router-events hooks must be used within RouteChangesProvider')

  return context
}
