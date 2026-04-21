'use client'

import { observer } from 'mobx-react-lite'
import '@/lib/mobx-static-rendering'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTodoStore } from '@/features/todos/todo-store-provider'

export const InsightsPanel = observer(function InsightsPanel() {
  const store = useTodoStore()

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Todo insights</CardTitle>
          <CardDescription>
            This page proves the store survives client-side route changes while the provider stays
            mounted in the root layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Metric label="Open" value={store.openTodos} />
          <Metric label="Complete" value={store.completedTodos} />
          <Metric label="High priority" value={store.highPriorityTodos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next recommended task</CardTitle>
          <CardDescription>A tiny derived view from the MobX Keystone model tree.</CardDescription>
        </CardHeader>
        <CardContent>
          {store.nextTodo ? (
            <div className="rounded-3xl border border-border bg-background/70 p-5">
              <Badge variant={store.nextTodo.priority === 'high' ? 'accent' : 'outline'}>
                {store.nextTodo.priority}
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold">{store.nextTodo.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{store.nextTodo.notes}</p>
            </div>
          ) : (
            <p className="rounded-3xl border border-border bg-background/70 p-5 text-sm text-muted-foreground">
              Everything is complete. Extremely suspicious, but we will allow it.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-background/70 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
