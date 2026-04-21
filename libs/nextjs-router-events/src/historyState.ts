import { useId, useLayoutEffect, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { isServer } from './util'

const TOKEN_KEY = '__next_router_events_token'
const INDEX_KEY = '__next_router_events_index'

export interface HistoryMetaState {
  token: string
  index: number
}

const defaultMeta: HistoryMetaState = { token: '', index: 0 }

type Originals = {
  pushState: History['pushState']
  replaceState: History['replaceState']
}

let originals: Originals | null = null
const metaRef = { current: defaultMeta } as MutableRefObject<HistoryMetaState>

const withMeta = (state: unknown, meta: HistoryMetaState) => ({
  ...(state ?? {}),
  [TOKEN_KEY]: meta.token,
  [INDEX_KEY]: meta.index,
})

export const readMeta = (state: unknown): HistoryMetaState | null => {
  if (!state || typeof state !== 'object') return null
  const token = (state as Record<string, unknown>)[TOKEN_KEY]
  const index = (state as Record<string, unknown>)[INDEX_KEY]

  if (typeof token !== 'string' || typeof index !== 'number') return null

  return { token, index }
}

const syncMeta = () => {
  if (isServer() || !originals) return
  const currentState = window.history.state
  const nextState = withMeta(currentState, metaRef.current)
  originals.replaceState.call(window.history, nextState, '', window.location.href)
}

const ensureAugmented = (fallbackToken: string) => {
  if (isServer()) return
  if (originals) {
    syncMeta()
    return
  }

  originals = {
    pushState: window.history.pushState,
    replaceState: window.history.replaceState,
  }

  const existingMeta = readMeta(window.history.state)
  metaRef.current = {
    token: existingMeta?.token ?? fallbackToken,
    index: existingMeta?.index ?? 0,
  }

  syncMeta()

  window.history.pushState = function pushStateWithMeta(state, unused, url) {
    if (!originals) return undefined

    metaRef.current = {
      ...metaRef.current,
      index: metaRef.current.index + 1,
    }

    const nextState = withMeta(state, metaRef.current)
    return originals.pushState.call(this, nextState, unused, url)
  }

  window.history.replaceState = function replaceStateWithMeta(state, unused, url) {
    if (!originals) return undefined

    const nextState = withMeta(state, metaRef.current)
    return originals.replaceState.call(this, nextState, unused, url)
  }
}

interface HistoryAugmentationHandle {
  metaRef: MutableRefObject<HistoryMetaState>
  readMeta: (state: unknown) => HistoryMetaState | null
  syncMeta: () => void
}

export const useHistoryAugmentation = (): HistoryAugmentationHandle => {
  const fallbackToken = useId()

  useLayoutEffect(() => {
    ensureAugmented(fallbackToken)
  }, [fallbackToken])

  return useMemo(
    () => ({
      metaRef,
      readMeta,
      syncMeta,
    }),
    []
  )
}
