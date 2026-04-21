'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouteChangeEvents, type RouteChangeSource } from 'nextjs-router-events'

type ProgressState = 'idle' | 'loading' | 'complete'

const SOURCE_LABEL: Record<RouteChangeSource, string> = {
  anchor: 'Link navigation',
  'router.push': 'router.push',
  'router.replace': 'router.replace',
  'router.back': 'router.back',
  'router.forward': 'router.forward',
  popstate: 'Browser history',
}

export function useRouteProgress() {
  const [state, setState] = useState<ProgressState>('idle')
  const [value, setValue] = useState(0)
  const [label, setLabel] = useState('Ready')
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    finishTimerRef.current = null
    settleTimerRef.current = null
  }

  useRouteChangeEvents({
    onRouteChangeStart: (_target, detail) => {
      clearTimers()
      setState('loading')
      setValue(24)
      setLabel(`${SOURCE_LABEL[detail.source]} started`)

      settleTimerRef.current = setTimeout(() => {
        setValue(68)
      }, 80)
    },
    onRouteChangeComplete: (_target, detail) => {
      clearTimers()
      setState('complete')
      setValue(100)
      setLabel(`${SOURCE_LABEL[detail.source]} complete`)

      finishTimerRef.current = setTimeout(() => {
        setState('idle')
        setValue(0)
        setLabel('Ready')
      }, 650)
    },
  })

  useEffect(() => clearTimers, [])

  return {
    label,
    state,
    value,
  }
}
