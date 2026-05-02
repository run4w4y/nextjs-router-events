export type HistoryURL = string | URL | null | undefined

export type RouteChangeSource =
  | 'anchor'
  | 'router.push'
  | 'router.replace'
  | 'router.back'
  | 'router.forward'
  | 'popstate'

export interface RouteChangeDetail {
  requestId: string
  targetUrl: string
  source: RouteChangeSource
  delta?: number
}

export interface RouteChangeEndDetail {
  targetUrl: HistoryURL
  requestId: string
  source: RouteChangeSource
  delta?: number
}

export interface RouteChangeCallbacks {
  onBeforeRouteChange?: (target: string, detail: RouteChangeDetail) => boolean | void
  onRouteChangeStart?: (target: string, detail: RouteChangeDetail) => void
  onRouteChangeComplete?: (target: HistoryURL, detail: RouteChangeEndDetail) => void
}

export type ForceAnchorClickEvent = MouseEvent & {
  isForceAnchorClickEvent: true
  forcedDetail: RouteChangeDetail
}

let requestCounter = 0

const createRequestId = () => `nre-${Date.now()}-${++requestCounter}`

export const createRouteChangeDetail = (
  detail: Omit<RouteChangeDetail, 'requestId'> & { requestId?: string }
): RouteChangeDetail => ({
  ...detail,
  requestId: detail.requestId ?? createRequestId(),
})
