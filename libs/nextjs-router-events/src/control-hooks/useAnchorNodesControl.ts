'use client'

import { useEffect } from 'react'
import {
  createRouteChangeDetail,
  type ForceAnchorClickEvent,
  type RouteChangeDetail,
} from '../events'
import { useFreezeRequestsContext } from '../context'

export type GetAnchorChildrenFn = (parentNode: HTMLElement) => Iterable<HTMLAnchorElement>

interface AnchorNodesControlProps {
  freezeRequests: string[]
  getAnchorChildren: GetAnchorChildrenFn
}

const createForceClickEvent = (
  event: MouseEvent,
  detail: RouteChangeDetail
): ForceAnchorClickEvent => {
  const nextEvent = new MouseEvent('click', event) as ForceAnchorClickEvent
  nextEvent.isForceAnchorClickEvent = true
  nextEvent.forcedDetail = detail
  return nextEvent
}

const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

const isManagedAnchor = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  const targetUrl = new URL(anchor.href, window.location.href)
  const currentUrl = new URL(window.location.href)

  if (targetUrl.origin !== currentUrl.origin) return false
  if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search)
    return false

  return true
}

const useAnchorNodesControl = ({ freezeRequests, getAnchorChildren }: AnchorNodesControlProps) => {
  const { registerPending, resolvePending, confirmBeforeRouteChange, beginRouteChange } =
    useFreezeRequestsContext()

  useEffect(() => {
    const abortController = new AbortController()

    const handleAnchorClick = (event: MouseEvent | ForceAnchorClickEvent) => {
      const target = event.currentTarget as HTMLAnchorElement

      if ((event as ForceAnchorClickEvent).isForceAnchorClickEvent) return
      if (event.defaultPrevented || isModifiedClick(event) || !isManagedAnchor(target)) return

      const detail = createRouteChangeDetail({ targetUrl: target.href, source: 'anchor' })
      const execute = () => {
        beginRouteChange(detail)
        target.dispatchEvent(createForceClickEvent(event, detail))
      }

      if (freezeRequests.length === 0) {
        beginRouteChange(detail)
        return
      }

      event.preventDefault()
      event.stopPropagation()

      registerPending(detail, execute)

      if (!confirmBeforeRouteChange(detail)) return

      resolvePending(detail.requestId)
    }

    const handleAnchors = (anchors: Iterable<HTMLAnchorElement>) => {
      for (const anchor of anchors) {
        anchor.addEventListener('click', handleAnchorClick, {
          signal: abortController.signal,
          capture: true,
        })
      }
    }

    const handleMutation: MutationCallback = (mutationList) => {
      mutationList.forEach((record) => {
        if (record.type !== 'childList' || !(record.target instanceof HTMLElement)) return

        handleAnchors(getAnchorChildren(record.target))
      })
    }

    handleAnchors(getAnchorChildren(document.body))

    const mutationObserver = new MutationObserver(handleMutation)
    mutationObserver.observe(document, { childList: true, subtree: true })

    return () => {
      mutationObserver.disconnect()
      abortController.abort()
    }
  }, [
    freezeRequests,
    getAnchorChildren,
    registerPending,
    resolvePending,
    confirmBeforeRouteChange,
    beginRouteChange,
  ])
}

export default useAnchorNodesControl
