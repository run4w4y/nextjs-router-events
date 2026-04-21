'use client'

import { useState } from 'react'
import type { HistoryURL, RouteChangeDetail, RouteChangeEndDetail } from 'nextjs-router-events'
import { useRouteChangeEvents } from 'nextjs-router-events'

type EventPhase = 'before' | 'start' | 'complete'

interface RouteEventLogItem {
  id: string
  phase: EventPhase
  source: string
  targetUrl: string
  requestId: string
  delta?: number
}

const formatTarget = (target: HistoryURL) => {
  if (target instanceof URL) return target.href
  return String(target ?? '')
}

export function useRouteEventLog() {
  const [items, setItems] = useState<RouteEventLogItem[]>([])

  const append = (
    phase: EventPhase,
    targetUrl: HistoryURL,
    detail: RouteChangeDetail | RouteChangeEndDetail
  ) => {
    setItems((current) =>
      [
        {
          id: `${phase}-${detail.requestId}-${current.length}`,
          phase,
          source: detail.source,
          targetUrl: formatTarget(targetUrl),
          requestId: detail.requestId,
          delta: detail.delta,
        },
        ...current,
      ].slice(0, 30)
    )
  }

  useRouteChangeEvents({
    onBeforeRouteChange: (targetUrl, detail) => {
      append('before', targetUrl, detail)
      return true
    },
    onRouteChangeStart: (targetUrl, detail) => {
      append('start', targetUrl, detail)
    },
    onRouteChangeComplete: (targetUrl, detail) => {
      append('complete', targetUrl, detail)
    },
  })

  return {
    items,
    clear: () => setItems([]),
  }
}
