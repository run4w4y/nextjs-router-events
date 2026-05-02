'use client'

import { FreezeRequestsContext } from './context'
import type { RouteChangeListener } from './context'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import usePopstateControl from './control-hooks/usePopstateControl'
import useAnchorNodesControl, {
  type GetAnchorChildrenFn,
} from './control-hooks/useAnchorNodesControl'
import type {
  HistoryURL,
  RouteChangeDetail,
  RouteChangeEndDetail,
  RouteChangeSource,
} from './events'

export const defaultGetAnchorChildren: GetAnchorChildrenFn = (node) => {
  return node.querySelectorAll('a[href]:not([data-ignore-router-events="true"])')
}

interface RouteChangesProviderProps {
  children: React.ReactNode
  getAnchorChildren?: GetAnchorChildrenFn
}

const RouteChangesRuntime = ({
  children,
  freezeRequests,
  getAnchorChildren,
}: {
  children: React.ReactNode
  freezeRequests: string[]
  getAnchorChildren: GetAnchorChildrenFn
}) => {
  useAnchorNodesControl({ freezeRequests, getAnchorChildren })
  usePopstateControl({ freezeRequests })

  return <>{children}</>
}

export const RouteChangesProvider: React.FC<RouteChangesProviderProps> = ({
  children,
  getAnchorChildren = defaultGetAnchorChildren,
}) => {
  const [freezeRequests, setFreezeRequests] = useState<string[]>([])
  const listenersRef = useRef(new Map<string, RouteChangeListener>())
  const pendingNavigationsRef = useRef(new Map<string, () => void>())
  const blockedNavigationsRef = useRef(
    new Map<string, { detail: RouteChangeDetail; blockers: Set<string> }>()
  )
  const activeRouteChangeRef = useRef<RouteChangeDetail | null>(null)
  const nextPopstateSourceRef = useRef<RouteChangeSource | null>(null)
  const lastCommittedHrefRef = useRef<HistoryURL>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ''

  const clearBlockedForSource = useCallback((sourceId: string) => {
    for (const [requestId, blocked] of blockedNavigationsRef.current) {
      if (!blocked.blockers.has(sourceId)) continue

      blocked.blockers.delete(sourceId)

      if (blocked.blockers.size !== 0) continue

      blockedNavigationsRef.current.delete(requestId)
      pendingNavigationsRef.current.delete(requestId)
    }
  }, [])

  const beginRouteChange = useCallback((detail: RouteChangeDetail) => {
    activeRouteChangeRef.current = detail

    for (const listener of listenersRef.current.values()) {
      listener.callbacksRef.current.onRouteChangeStart?.(detail.targetUrl, detail)
    }
  }, [])

  const completeRouteChange = useCallback((targetUrl: HistoryURL) => {
    const detail = activeRouteChangeRef.current
    activeRouteChangeRef.current = null

    if (!detail) return

    const endDetail: RouteChangeEndDetail = {
      targetUrl,
      requestId: detail.requestId,
      source: detail.source,
      delta: detail.delta,
    }

    for (const listener of listenersRef.current.values()) {
      listener.callbacksRef.current.onRouteChangeComplete?.(targetUrl, endDetail)
    }
  }, [])

  const resolvePending = useCallback((requestId: string) => {
    const resume = pendingNavigationsRef.current.get(requestId)
    if (!resume) return

    pendingNavigationsRef.current.delete(requestId)
    resume()
  }, [])

  const request = useCallback((sourceId: string) => {
    setFreezeRequests((current) => {
      if (current.includes(sourceId)) return current
      return [...current, sourceId]
    })
  }, [])

  const revoke = useCallback(
    (sourceId: string) => {
      listenersRef.current.delete(sourceId)
      clearBlockedForSource(sourceId)
      setFreezeRequests((current) => current.filter((item) => item !== sourceId))
    },
    [clearBlockedForSource]
  )

  const registerListener = useCallback((sourceId: string, listener: RouteChangeListener) => {
    listenersRef.current.set(sourceId, listener)
  }, [])

  const unregisterListener = useCallback(
    (sourceId: string) => {
      listenersRef.current.delete(sourceId)
      clearBlockedForSource(sourceId)
    },
    [clearBlockedForSource]
  )

  const confirmBeforeRouteChange = useCallback(
    (detail: RouteChangeDetail) => {
      const blockers = new Set<string>()

      for (const [sourceId, listener] of listenersRef.current) {
        clearBlockedForSource(sourceId)
        const shouldProceed =
          listener.callbacksRef.current.onBeforeRouteChange?.(detail.targetUrl, detail) ?? true

        if (shouldProceed) continue

        blockers.add(sourceId)
        listener.setPendingDetail(detail)
      }

      if (blockers.size === 0) return true

      blockedNavigationsRef.current.set(detail.requestId, { detail, blockers })
      return false
    },
    [clearBlockedForSource]
  )

  const confirmRouteChange = useCallback(
    (requestId: string, sourceId: string) => {
      const blocked = blockedNavigationsRef.current.get(requestId)
      if (!blocked) return

      listenersRef.current.get(sourceId)?.setPendingDetail(null)
      blocked.blockers.delete(sourceId)

      if (blocked.blockers.size !== 0) return

      blockedNavigationsRef.current.delete(requestId)
      resolvePending(requestId)
    },
    [resolvePending]
  )

  const registerPending = useCallback((detail: RouteChangeDetail, resume: () => void) => {
    pendingNavigationsRef.current.set(detail.requestId, resume)
  }, [])

  const setNextPopstateSource = useCallback((source: RouteChangeSource) => {
    nextPopstateSourceRef.current = source
  }, [])

  const consumeNextPopstateSource = useCallback(() => {
    const source = nextPopstateSourceRef.current
    nextPopstateSourceRef.current = null
    return source
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentHref = window.location.href

    if (lastCommittedHrefRef.current === null) {
      lastCommittedHrefRef.current = currentHref
      return
    }

    if (lastCommittedHrefRef.current === currentHref) return

    lastCommittedHrefRef.current = currentHref
    completeRouteChange(currentHref)
  }, [pathname, search, completeRouteChange])

  useEffect(() => {
    return () => {
      listenersRef.current.clear()
      pendingNavigationsRef.current.clear()
      blockedNavigationsRef.current.clear()
      activeRouteChangeRef.current = null
      nextPopstateSourceRef.current = null
    }
  }, [])

  const value = useMemo(
    () => ({
      freezeRequests,
      request,
      revoke,
      registerListener,
      unregisterListener,
      confirmBeforeRouteChange,
      confirmRouteChange,
      registerPending,
      resolvePending,
      beginRouteChange,
      completeRouteChange,
      setNextPopstateSource,
      consumeNextPopstateSource,
    }),
    [
      freezeRequests,
      request,
      revoke,
      registerListener,
      unregisterListener,
      confirmBeforeRouteChange,
      confirmRouteChange,
      registerPending,
      resolvePending,
      beginRouteChange,
      completeRouteChange,
      setNextPopstateSource,
      consumeNextPopstateSource,
    ]
  )

  return (
    <FreezeRequestsContext.Provider value={value}>
      <RouteChangesRuntime freezeRequests={freezeRequests} getAnchorChildren={getAnchorChildren}>
        {children}
      </RouteChangesRuntime>
    </FreezeRequestsContext.Provider>
  )
}
