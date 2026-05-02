'use client'

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { unregisterRootStore } from 'mobx-keystone'
import '@/lib/mobx-static-rendering'
import { createTodoStore, type TodoStore } from './todo-store'

const TodoStoreContext = createContext<TodoStore | null>(null)

export function TodoStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<TodoStore | null>(null)

  if (!storeRef.current) {
    storeRef.current = createTodoStore()
  }

  useEffect(() => {
    const store = storeRef.current

    return () => {
      if (store) unregisterRootStore(store)
    }
  }, [])

  return <TodoStoreContext.Provider value={storeRef.current}>{children}</TodoStoreContext.Provider>
}

export const useTodoStore = () => {
  const store = useContext(TodoStoreContext)

  if (!store) {
    throw new Error('useTodoStore must be used within TodoStoreProvider')
  }

  return store
}
