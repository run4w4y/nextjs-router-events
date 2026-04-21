'use client'

import { Model, idProp, model, prop, registerRootStore } from 'mobx-keystone'

export type TodoPriority = 'low' | 'medium' | 'high'

const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

let generatedId = 0

const createTodoId = () => `todo-${Date.now().toString(36)}-${++generatedId}`

class TodoItemBase extends Model({
  id: idProp,
  title: prop<string>().withSetter(),
  notes: prop<string>().withSetter(),
  completed: prop<boolean>().withSetter(),
  priority: prop<TodoPriority>().withSetter(),
}) {}

const TodoItemModel = model('nextjs-router-events.example/TodoItem')(TodoItemBase)
export type TodoItem = InstanceType<typeof TodoItemModel>

class TodoDraftBase extends Model({
  id: idProp,
  title: prop<string>().withSetter(),
  notes: prop<string>().withSetter(),
  completed: prop<boolean>().withSetter(),
  priority: prop<TodoPriority>().withSetter(),
  isNew: prop<boolean>().withSetter(),
}) {}

const TodoDraftModel = model('nextjs-router-events.example/TodoDraft')(TodoDraftBase)
export type TodoDraft = InstanceType<typeof TodoDraftModel>

interface TodoInput {
  id: string
  title: string
  notes: string
  completed?: boolean
  priority?: TodoPriority
}

interface DraftSnapshot {
  title: string
  notes: string
  completed: boolean
  priority: TodoPriority
}

const createTodo = (todo: TodoInput) =>
  new TodoItemModel({
    id: todo.id,
    title: todo.title,
    notes: todo.notes,
    completed: todo.completed ?? false,
    priority: todo.priority ?? 'medium',
  })

const createDraft = (todo: TodoItem, isNew = false) =>
  new TodoDraftModel({
    id: todo.id,
    title: todo.title,
    notes: todo.notes,
    completed: todo.completed,
    priority: todo.priority,
    isNew,
  })

const createBlankDraft = () =>
  new TodoDraftModel({
    id: createTodoId(),
    title: '',
    notes: '',
    completed: false,
    priority: 'medium',
    isNew: true,
  })

const createInitialTodos = () => [
  createTodo({
    id: 'todo-router-events',
    title: 'Document the route event lifecycle',
    notes:
      'Show before, start, and complete callbacks so package users can reason about guarded and unguarded navigation.',
    priority: 'high',
  }),
  createTodo({
    id: 'todo-progress-demo',
    title: 'Wire up the progress bar',
    notes:
      'Use routeChangeStart and routeChangeComplete as the only source of truth for the demo loading indicator.',
    priority: 'medium',
  }),
  createTodo({
    id: 'todo-e2e',
    title: 'Keep the e2e harness realistic',
    notes:
      'The same app should be useful in Playwright, in local manual testing, and as a hosted example.',
    completed: true,
    priority: 'low',
  }),
]

const toComparableDraft = (draft: TodoDraft): DraftSnapshot => ({
  title: draft.title,
  notes: draft.notes,
  completed: draft.completed,
  priority: draft.priority,
})

const toComparableTodo = (todo: TodoItem): DraftSnapshot => ({
  title: todo.title,
  notes: todo.notes,
  completed: todo.completed,
  priority: todo.priority,
})

const areDraftsEqual = (left: DraftSnapshot, right: DraftSnapshot) =>
  left.title === right.title &&
  left.notes === right.notes &&
  left.completed === right.completed &&
  left.priority === right.priority

class TodoStoreBase extends Model({
  todos: prop<TodoItem[]>().withSetter(),
  selectedId: prop<string>().withSetter(),
  draft: prop<TodoDraft>().withSetter(),
}) {
  get selectedTodo() {
    return this.todos.find((todo) => todo.id === this.selectedId)
  }

  get openTodos() {
    return this.todos.filter((todo) => !todo.completed).length
  }

  get completedTodos() {
    return this.todos.filter((todo) => todo.completed).length
  }

  get highPriorityTodos() {
    return this.todos.filter((todo) => todo.priority === 'high' && !todo.completed).length
  }

  get nextTodo() {
    return [...this.todos]
      .filter((todo) => !todo.completed)
      .sort((left, right) => PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority])[0]
  }

  get isDraftDirty() {
    if (this.draft.isNew) {
      return (
        this.draft.title.trim().length > 0 ||
        this.draft.notes.trim().length > 0 ||
        this.draft.completed ||
        this.draft.priority !== 'medium'
      )
    }

    if (!this.selectedTodo) return false

    return !areDraftsEqual(toComparableDraft(this.draft), toComparableTodo(this.selectedTodo))
  }

  get canSaveDraft() {
    return this.draft.title.trim().length > 0 && this.isDraftDirty
  }

  selectTodo(id: string) {
    const todo = this.todos.find((item) => item.id === id)

    if (!todo) return

    this.setSelectedId(todo.id)
    this.setDraft(createDraft(todo))
  }

  startNewTodo() {
    const draft = createBlankDraft()
    this.setSelectedId(draft.id)
    this.setDraft(draft)
  }

  saveDraft() {
    if (!this.canSaveDraft) return

    const nextTodo = createTodo({
      id: this.draft.id,
      title: this.draft.title.trim(),
      notes: this.draft.notes.trim(),
      completed: this.draft.completed,
      priority: this.draft.priority,
    })
    const existingIndex = this.todos.findIndex((todo) => todo.id === this.draft.id)

    if (existingIndex === -1) {
      this.setTodos([nextTodo, ...this.todos])
    } else {
      this.setTodos(this.todos.map((todo, index) => (index === existingIndex ? nextTodo : todo)))
    }

    this.setSelectedId(nextTodo.id)
    this.setDraft(createDraft(nextTodo))
  }

  resetDraft() {
    const todo = this.selectedTodo

    if (!todo) {
      this.startNewTodo()
      return
    }

    this.setDraft(createDraft(todo))
  }

  toggleSelectedCompleted() {
    this.draft.setCompleted(!this.draft.completed)
  }

  updateDraftTitle(title: string) {
    this.draft.setTitle(title)
  }

  updateDraftNotes(notes: string) {
    this.draft.setNotes(notes)
  }

  updateDraftPriority(priority: TodoPriority) {
    this.draft.setPriority(priority)
  }
}

const TodoStoreModel = model('nextjs-router-events.example/TodoStore')(TodoStoreBase)
export type TodoStore = InstanceType<typeof TodoStoreModel>

export const createTodoStore = () => {
  const todos = createInitialTodos()

  return registerRootStore(
    new TodoStoreModel({
      todos,
      selectedId: todos[0].id,
      draft: createDraft(todos[0]),
    })
  )
}
