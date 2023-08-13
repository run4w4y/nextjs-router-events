import { isServer } from './util'

export type HistoryURL = string | URL | null | undefined

export type RouteChangeStartEvent = CustomEvent<{ targetUrl: string }>
export type RouteChangeEndEvent = CustomEvent<{ targetUrl: HistoryURL }>
export type ForceAnchorClickEvent = MouseEvent & { isForceAnchorClickEvent: true }

declare global {
  interface WindowEventMap {
    beforeRouteChangeEvent: RouteChangeStartEvent
    routeChangeConfirmationEvent: RouteChangeStartEvent
    routeChangeStartEvent: RouteChangeStartEvent
    routeChangeEndEvent: RouteChangeEndEvent
  }
}

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
