'use client'

import { cn } from '@/lib/utils'
import { useRouteProgress } from './use-route-progress'

export function NavigationProgress() {
  const progress = useRouteProgress()

  return (
    <div
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 top-0 z-[60] h-1 transition-opacity duration-300',
        progress.state === 'idle' ? 'opacity-0' : 'opacity-100'
      )}
      data-state={progress.state}
      data-testid="route-progress"
    >
      <div
        className="h-full rounded-r-full bg-indigo-600 transition-[width] duration-500 ease-out"
        style={{ width: `${progress.value}%` }}
      />
      <span className="sr-only">{progress.label}</span>
    </div>
  )
}
