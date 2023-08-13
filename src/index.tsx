'use client'

import { isServer, noop } from './util'
import React, { useContext, useEffect, useState, useId } from 'react'

type HistoryURL = string | URL | null | undefined

type RouteChangeStartEvent = CustomEvent<{ targetUrl: string }>
type RouteChangeEndEvent = CustomEvent<{ targetUrl: HistoryURL }>
type ForceAnchorClickEvent = MouseEvent & { isForceAnchorClickEvent: true }

declare global {
  interface WindowEventMap {
    beforeRouteChangeEvent: RouteChangeStartEvent
    routeChangeConfirmationEvent: RouteChangeStartEvent
    routeChangeStartEvent: RouteChangeStartEvent
    routeChangeEndEvent: RouteChangeEndEvent
  }
}

interface FreezeRequestsContextValue {
  freezeRequests: string[]
  setFreezeRequests: React.Dispatch<React.SetStateAction<string[]>>
}

const FreezeRequestsContext = React.createContext<FreezeRequestsContextValue>({
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

type PushStateInput = [data: unknown, unused: string, url: HistoryURL]

export const triggerRouteChangeStartEvent = (targetUrl: string): void => {
  const ev = new CustomEvent('routeChangeStartEvent', { detail: { targetUrl } })
  if (!isServer()) window.dispatchEvent(ev)
}

export const triggerRouteChangeEndEvent = (targetUrl: HistoryURL): void => {
  const ev = new CustomEvent('routeChangeEndEvent', { detail: { targetUrl } })
  if (!isServer()) window.dispatchEvent(ev)
}

export const triggerBeforeRouteChangeEvent = (targetUrl: string): void => {
  const ev = new CustomEvent('beforeRouteChangeEvent', { detail: { targetUrl } })
  if (!isServer()) window.dispatchEvent(ev)
}

export const triggerRouteChangeConfirmationEvent = (targetUrl: string): void => {
  const ev = new CustomEvent('routeChangeConfirmationEvent', { detail: { targetUrl } })
  if (!isServer()) window.dispatchEvent(ev)
}

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

interface RouteChangeCallbacks {
  onBeforeRouteChange?: (target: string) => boolean | void // if `false` prevents a route change until `allowRouteChange` is called
  onRouteChangeStart?: (target: string) => void
  onRouteChangeComplete?: (target: HistoryURL) => void
}

export const useRouteChangeEvents = (callbacks: RouteChangeCallbacks) => {
  const id = useId()
  const { request, revoke } = useFreezeRequestsContext()
  const [confrimationTarget, setConfirmationTarget] = useState<string | null>(null)

  useEffect(() => {
    request(id)

    return () => revoke(id)
  }, [])

  useEffect(() => {
    const abortController = new AbortController()

    window.addEventListener(
      'beforeRouteChangeEvent',
      (ev) => {
        const { targetUrl } = ev.detail
        const shouldProceed =
          callbacks.onBeforeRouteChange && callbacks.onBeforeRouteChange(targetUrl)
        if (shouldProceed ?? true) {
          triggerRouteChangeConfirmationEvent(targetUrl)
        } else {
          setConfirmationTarget(targetUrl)
        }
      },
      { signal: abortController.signal }
    )

    window.addEventListener(
      'routeChangeEndEvent',
      (ev) => {
        callbacks.onRouteChangeComplete && callbacks.onRouteChangeComplete(ev.detail.targetUrl)
      },
      { signal: abortController.signal }
    )

    window.addEventListener(
      'routeChangeStartEvent',
      (ev) => {
        callbacks.onRouteChangeStart && callbacks.onRouteChangeStart(ev.detail.targetUrl)
      },
      { signal: abortController.signal }
    )

    return () => abortController.abort()
  }, [callbacks])

  return {
    allowRouteChange: () => {
      if (!confrimationTarget) {
        console.warn('allowRouteChange called for no specified confirmation target')
        return
      }
      triggerRouteChangeConfirmationEvent(confrimationTarget)
    },
  }
}
