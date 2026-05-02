'use client'

import { useEffect, useRef, useState } from 'react'
import { type RouteChangeDetail, useRouteChangeEvents } from 'nextjs-router-events'
import { useBeforeUnload } from './use-before-unload'

type PendingLeave =
  | {
      kind: 'route'
      detail: RouteChangeDetail
      source: RouteChangeDetail['source']
      targetUrl: string
    }
  | {
      kind: 'document'
      source: 'external-link' | 'document-link'
      targetUrl: string
    }

const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

const getSameTabAnchor = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return null

  const anchor = event.target.closest('a[href]')

  if (!(anchor instanceof HTMLAnchorElement)) return null
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.hasAttribute('download')) return null

  return anchor
}

const shouldGuardDocumentLink = (anchor: HTMLAnchorElement) => {
  const targetUrl = new URL(anchor.href, window.location.href)
  const currentUrl = new URL(window.location.href)

  if (targetUrl.origin !== currentUrl.origin) return 'external-link'
  if (anchor.dataset['ignoreRouterEvents'] === 'true') return 'document-link'

  return null
}

export function useLeaveConfirmation({
  shouldPreventLeave,
  onConfirmLeave,
}: {
  shouldPreventLeave: boolean
  onConfirmLeave: () => void
}) {
  const shouldPreventRef = useRef(shouldPreventLeave)
  const bypassBeforeUnloadRef = useRef(false)
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null)

  shouldPreventRef.current = shouldPreventLeave

  const { allowRouteChange } = useRouteChangeEvents({
    onBeforeRouteChange: (_target, detail) => {
      if (!shouldPreventRef.current) return true

      setPendingLeave({
        kind: 'route',
        detail,
        source: detail.source,
        targetUrl: detail.targetUrl,
      })
      return false
    },
    onRouteChangeComplete: () => {
      setPendingLeave(null)
    },
  })

  useBeforeUnload(shouldPreventRef, bypassBeforeUnloadRef)

  useEffect(() => {
    const abortController = new AbortController()

    window.addEventListener(
      'click',
      (event) => {
        if (!shouldPreventRef.current || event.defaultPrevented || isModifiedClick(event)) return

        const anchor = getSameTabAnchor(event)
        if (!anchor) return

        const source = shouldGuardDocumentLink(anchor)
        if (!source) return

        event.preventDefault()
        event.stopPropagation()
        setPendingLeave({
          kind: 'document',
          source,
          targetUrl: anchor.href,
        })
      },
      { capture: true, signal: abortController.signal }
    )

    return () => abortController.abort()
  }, [])

  const cancelLeave = () => {
    setPendingLeave(null)
  }

  const confirmLeave = () => {
    if (!pendingLeave) return

    onConfirmLeave()
    setPendingLeave(null)

    if (pendingLeave.kind === 'route') {
      allowRouteChange()
      return
    }

    bypassBeforeUnloadRef.current = true
    window.location.assign(pendingLeave.targetUrl)
  }

  return {
    cancelLeave,
    confirmLeave,
    pendingLeave,
  }
}
