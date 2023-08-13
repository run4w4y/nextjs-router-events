'use client'

import { FreezeRequestsContext } from './context'
import {
  type ForceAnchorClickEvent,
  type HistoryURL,
  triggerBeforeRouteChangeEvent,
  triggerRouteChangeEndEvent,
  triggerRouteChangeStartEvent,
} from './events'
import React, { useEffect, useState } from 'react'

type PushStateInput = [data: unknown, unused: string, url: HistoryURL]

const createForceClickEvent = (event: MouseEvent): ForceAnchorClickEvent => {
  const res = new MouseEvent('click', event) as ForceAnchorClickEvent
  res.isForceAnchorClickEvent = true
  return res
}

export const RouteChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [freezeRequests, setFreezeRequests] = useState<string[]>([])

  useEffect(() => {
    const abortController = new AbortController()

    const handleAnchorClick = (event: MouseEvent | ForceAnchorClickEvent) => {
      const target = event.currentTarget as HTMLAnchorElement

      const isFrozen = freezeRequests.length !== 0
      if (isFrozen && !(event as ForceAnchorClickEvent).isForceAnchorClickEvent) {
        event.preventDefault()
        event.stopPropagation()

        window.addEventListener(
          'routeChangeConfirmationEvent',
          (ev) => {
            if (ev.detail.targetUrl === target.href) {
              const forceClickEvent = createForceClickEvent(event)
              target.dispatchEvent(forceClickEvent) // NOTE: may want to use a timeout here
            }
          },
          { signal: abortController.signal }
        )

        triggerBeforeRouteChangeEvent(target.href)
        return
      }

      triggerRouteChangeStartEvent(target.href)
    }

    const handleAnchors = (anchors: NodeListOf<HTMLAnchorElement>) => {
      anchors.forEach((a) => {
        a.addEventListener('click', handleAnchorClick, {
          signal: abortController.signal,
          capture: true,
        })
      })
    }

    const handleMutation: MutationCallback = (mutationList) => {
      mutationList.forEach((record) => {
        if (record.type === 'childList' && record.target instanceof HTMLElement) {
          const anchors: NodeListOf<HTMLAnchorElement> = record.target.querySelectorAll('a[href]')
          handleAnchors(anchors)
        }
      })
    }

    const anchors: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('a[href]')
    handleAnchors(anchors)

    const mutationObserver = new MutationObserver(handleMutation)

    mutationObserver.observe(document, { childList: true, subtree: true })

    const pushStateProxy = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray: PushStateInput) => {
        triggerRouteChangeEndEvent(argArray[2])
        return target.apply(thisArg, argArray)
      },
      getPrototypeOf: (target) => {
        return target
      },
    })

    window.history.pushState = pushStateProxy

    return () => {
      mutationObserver.disconnect()
      abortController.abort()
      window.history.pushState = Object.getPrototypeOf(pushStateProxy)
    }
  }, [freezeRequests])

  return (
    <FreezeRequestsContext.Provider value={{ freezeRequests, setFreezeRequests }}>
      {children}
    </FreezeRequestsContext.Provider>
  )
}
