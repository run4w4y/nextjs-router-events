'use client'

import { observer } from 'mobx-react-lite'
import { CheckCircle2, Circle, Plus, RotateCcw, Save } from 'lucide-react'
import '@/lib/mobx-static-rendering'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useTodoStore } from '@/features/todos/todo-store-provider'
import type { TodoPriority } from '@/features/todos/todo-store'
import { cn } from '@/lib/utils'

const priorities: TodoPriority[] = ['low', 'medium', 'high']

const priorityLabel: Record<TodoPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const TodoStudio = observer(function TodoStudio() {
  const store = useTodoStore()

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Todo Studio</CardTitle>
              <CardDescription>
                MobX Keystone manages the todo list and an editable draft model.
              </CardDescription>
            </div>
            <Badge variant={store.isDraftDirty ? 'accent' : 'secondary'} data-testid="dirty-status">
              {store.isDraftDirty ? 'Unsaved draft' : 'All changes saved'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button type="button" variant="secondary" onClick={() => store.startNewTodo()}>
            <Plus className="size-4" aria-hidden="true" />
            New draft
          </Button>
          <div className="grid gap-3 md:grid-cols-3">
            {store.todos.map((todo) => (
              <button
                key={todo.id}
                type="button"
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors hover:bg-muted',
                  todo.id === store.selectedId
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-border bg-background'
                )}
                onClick={() => store.selectTodo(todo.id)}
              >
                <div className="flex items-start gap-3">
                  {todo.completed ? (
                    <CheckCircle2 className="mt-1 size-5 text-indigo-600" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{todo.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {todo.notes}
                    </p>
                  </div>
                  <Badge variant={todo.priority === 'high' ? 'accent' : 'outline'}>
                    {priorityLabel[todo.priority]}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Draft editor</CardTitle>
          <CardDescription>
            Try changing this form and navigating away. The app blocks the route change until you
            confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              store.saveDraft()
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-medium">Task title</span>
              <Input
                aria-label="Task title"
                value={store.draft.title}
                onChange={(event) => store.updateDraftTitle(event.target.value)}
                placeholder="Name the task"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Notes</span>
              <Textarea
                aria-label="Task notes"
                value={store.draft.notes}
                onChange={(event) => store.updateDraftNotes(event.target.value)}
                placeholder="Capture the implementation details"
              />
            </label>

            <div className="grid gap-3">
              <span className="text-sm font-medium">Priority</span>
              <div className="flex flex-wrap gap-2">
                {priorities.map((priority) => (
                  <Button
                    key={priority}
                    type="button"
                    variant={store.draft.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => store.updateDraftPriority(priority)}
                    data-testid={`priority-${priority}`}
                  >
                    {priorityLabel[priority]}
                  </Button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => store.toggleSelectedCompleted()}
            >
              {store.draft.completed ? (
                <CheckCircle2 className="size-5 text-indigo-600" aria-hidden="true" />
              ) : (
                <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{store.draft.completed ? 'Marked complete' : 'Still open'}</span>
            </button>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={!store.canSaveDraft} data-testid="save-draft">
                <Save className="size-4" aria-hidden="true" />
                Save draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => store.resetDraft()}
                disabled={!store.isDraftDirty}
                data-testid="reset-draft"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
})
