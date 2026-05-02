'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouteEventLog } from './use-route-event-log'

export function RouteEventLog() {
  const { items, clear } = useRouteEventLog()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="fixed right-4 bottom-4 z-40 grid justify-items-end gap-2">
      {isOpen ? (
        <Card className="max-h-[min(28rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-md overflow-hidden bg-background">
          <CardHeader className="flex-row items-start justify-between gap-4 border-b p-4">
            <div>
              <CardTitle className="text-base">Route event feed</CardTitle>
              <CardDescription>before, start, and complete callbacks.</CardDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clear} data-testid="clear-log">
              Clear
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <ol className="grid max-h-72 gap-2 overflow-auto pr-1" data-testid="event-log">
              {items.length === 0 ? (
                <li className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  No navigation events yet.
                </li>
              ) : (
                items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground"
                  >
                    {item.phase} {item.source} {item.targetUrl} ({item.requestId})
                    {typeof item.delta === 'number' ? ` delta=${item.delta}` : ''}
                  </li>
                ))
              )}
            </ol>
          </CardContent>
        </Card>
      ) : null}
      <Button
        type="button"
        variant="default"
        onClick={() => setIsOpen((current) => !current)}
        data-testid="route-event-feed-trigger"
        aria-expanded={isOpen}
      >
        {isOpen ? 'Hide route events' : `Show route events (${items.length})`}
      </Button>
    </div>
  )
}
