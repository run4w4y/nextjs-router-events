'use client'

import { useEffect, type RefObject } from 'react'

export function useBeforeUnload(
  shouldPreventRef: RefObject<boolean>,
  bypassRef: RefObject<boolean>,
  message = ''
) {
  useEffect(() => {
    const abortController = new AbortController()

    window.addEventListener(
      'beforeunload',
      (event) => {
        if (!shouldPreventRef.current || bypassRef.current) return

        event.preventDefault()
        event.returnValue = message
        return message
      },
      { capture: true, signal: abortController.signal }
    )

    return () => abortController.abort()
  }, [bypassRef, message, shouldPreventRef])
}
