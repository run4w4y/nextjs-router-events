'use client'

import { useLayoutEffect, useRef } from 'react'
import { createRouteChangeDetail } from '../events'
import { useHistoryAugmentation } from '../historyState'
import { useFreezeRequestsContext } from '../context'

interface PopstateControlProps {
  freezeRequests: string[]
}

const usePopstateControl = ({ freezeRequests }: PopstateControlProps) => {
  const { metaRef, readMeta, syncMeta } = useHistoryAugmentation()
  const {
    registerPending,
    confirmBeforeRouteChange,
    beginRouteChange,
    completeRouteChange,
    consumeNextPopstateSource,
  } = useFreezeRequestsContext()
  const allowNextRef = useRef(false)

  useLayoutEffect(() => {
    const abortController = new AbortController()
    const scheduleCompletionFallback = (targetUrl: string) => {
      window.setTimeout(() => {
        if (window.location.href !== targetUrl) return
        completeRouteChange(window.location.href)
      }, 0)
    }

    const handlePopstate = (event: PopStateEvent) => {
      const nextMeta = readMeta(event.state)

      if (allowNextRef.current) {
        allowNextRef.current = false
        if (nextMeta) {
          metaRef.current = nextMeta
          syncMeta()
        }
        return
      }

      if (!nextMeta) return

      const delta = nextMeta.index - metaRef.current.index
      if (delta === 0) return

      metaRef.current = nextMeta
      syncMeta()

      const source = consumeNextPopstateSource() ?? 'popstate'
      const detail = createRouteChangeDetail({
        targetUrl: window.location.href,
        source,
        delta,
      })

      if (freezeRequests.length === 0) {
        beginRouteChange(detail)
        scheduleCompletionFallback(detail.targetUrl)
        return
      }

      if (confirmBeforeRouteChange(detail)) {
        beginRouteChange(detail)
        scheduleCompletionFallback(detail.targetUrl)
        return
      }

      event.stopImmediatePropagation()

      registerPending(detail, () => {
        allowNextRef.current = true
        beginRouteChange(detail)
        window.history.go(delta)
        scheduleCompletionFallback(detail.targetUrl)
      })

      window.setTimeout(() => {
        allowNextRef.current = true
        window.history.go(-delta)
      }, 0)
    }

    window.addEventListener('popstate', handlePopstate, {
      signal: abortController.signal,
      capture: true,
    })

    return () => abortController.abort()
  }, [
    freezeRequests,
    metaRef,
    readMeta,
    syncMeta,
    registerPending,
    confirmBeforeRouteChange,
    beginRouteChange,
    completeRouteChange,
    consumeNextPopstateSource,
  ])
}

export default usePopstateControl
