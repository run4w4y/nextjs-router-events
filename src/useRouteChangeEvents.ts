import { useEffect, useId, useState } from 'react'
import { useFreezeRequestsContext } from './context'
import { type HistoryURL, triggerRouteChangeConfirmationEvent } from './events'

export interface RouteChangeCallbacks {
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
