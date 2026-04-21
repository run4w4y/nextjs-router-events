'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useFreezeRequestsContext } from './context'
import type { RouteChangeCallbacks, RouteChangeDetail } from './events'

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const useRouteChangeEvents = (callbacks: RouteChangeCallbacks) => {
  const id = useId()
  const { request, revoke, registerListener, unregisterListener, confirmRouteChange } =
    useFreezeRequestsContext()
  const callbacksRef = useRef(callbacks)
  const [pendingDetail, setPendingDetail] = useState<RouteChangeDetail | null>(null)

  useBrowserLayoutEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useBrowserLayoutEffect(() => {
    request(id)
    registerListener(id, { callbacksRef, setPendingDetail })

    return () => {
      unregisterListener(id)
      revoke(id)
    }
  }, [id, registerListener, request, revoke, unregisterListener])

  return {
    allowRouteChange: () => {
      if (!pendingDetail) {
        console.warn('allowRouteChange called for no specified confirmation target')
        return
      }

      confirmRouteChange(pendingDetail.requestId, id)
      setPendingDetail(null)
    },
  }
}
