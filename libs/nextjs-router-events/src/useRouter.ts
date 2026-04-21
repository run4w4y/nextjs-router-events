'use client'

import { useMemo } from 'react'
import { useRouter as usePrimitiveRouter } from 'next/navigation'
import { createRouteChangeDetail, type RouteChangeSource } from './events'
import { useFreezeRequestsContext } from './context'

type AppRouterInstance = ReturnType<typeof usePrimitiveRouter>

type RouterProxyProps = {
  target: AppRouterInstance
  isFrozen: boolean
  registerPending: ReturnType<typeof useFreezeRequestsContext>['registerPending']
  resolvePending: ReturnType<typeof useFreezeRequestsContext>['resolvePending']
  confirmBeforeRouteChange: ReturnType<typeof useFreezeRequestsContext>['confirmBeforeRouteChange']
  beginRouteChange: ReturnType<typeof useFreezeRequestsContext>['beginRouteChange']
  setNextPopstateSource: ReturnType<typeof useFreezeRequestsContext>['setNextPopstateSource']
}

const METHOD_SOURCES: Record<'push' | 'replace' | 'back' | 'forward', RouteChangeSource> = {
  push: 'router.push',
  replace: 'router.replace',
  back: 'router.back',
  forward: 'router.forward',
}

const createRouterProxy = ({
  target,
  isFrozen,
  registerPending,
  resolvePending,
  confirmBeforeRouteChange,
  beginRouteChange,
  setNextPopstateSource,
}: RouterProxyProps) =>
  new Proxy(target, {
    get: (currentTarget, prop, receiver) => {
      if (prop === 'push' || prop === 'replace') {
        return (href: string, options?: { scroll?: boolean }) => {
          const detail = createRouteChangeDetail({
            targetUrl: href,
            source: METHOD_SOURCES[prop],
          })

          const execute = () => {
            beginRouteChange(detail)
            currentTarget[prop](href, options)
          }

          if (!isFrozen) {
            execute()
            return
          }

          registerPending(detail, execute)

          if (!confirmBeforeRouteChange(detail)) return

          resolvePending(detail.requestId)
        }
      }

      if (prop === 'back' || prop === 'forward') {
        return () => {
          setNextPopstateSource(METHOD_SOURCES[prop])
          return currentTarget[prop]()
        }
      }

      return Reflect.get(currentTarget, prop, receiver)
    },
  })

export const useRouter = (): AppRouterInstance => {
  const router = usePrimitiveRouter()
  const {
    freezeRequests,
    registerPending,
    resolvePending,
    confirmBeforeRouteChange,
    beginRouteChange,
    setNextPopstateSource,
  } = useFreezeRequestsContext()

  return useMemo(
    () =>
      createRouterProxy({
        target: router,
        isFrozen: freezeRequests.length !== 0,
        registerPending,
        resolvePending,
        confirmBeforeRouteChange,
        beginRouteChange,
        setNextPopstateSource,
      }),
    [
      router,
      freezeRequests,
      registerPending,
      resolvePending,
      confirmBeforeRouteChange,
      beginRouteChange,
      setNextPopstateSource,
    ]
  )
}
