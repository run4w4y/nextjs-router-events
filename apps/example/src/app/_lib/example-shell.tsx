'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRouter } from 'nextjs-router-events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TodoStoreProvider } from '@/features/todos/todo-store-provider'
import { NavigationProgress } from './navigation-progress'
import { RouteEventLog } from './route-event-log'
import { UnsavedChangesDialog } from './unsaved-changes-dialog'

const links = [
  { href: '/', label: 'Overview' },
  { href: '/todos', label: 'Todos' },
  { href: '/insights', label: 'Insights' },
  { href: '/about', label: 'About' },
]

export function ExampleShell({ children }: { children: ReactNode }) {
  return (
    <TodoStoreProvider>
      <NavigationProgress />
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">nextjs-router-events</p>
              <h1 className="text-3xl font-bold tracking-tight">Todo demo</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                A small Next App Router app that demonstrates guarded dirty drafts, browser leave
                protection, and route-event powered progress.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Demo navigation">
              {links.map((link) => (
                <Button key={link.href} asChild variant="outline" size="sm">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
              <Button asChild variant="ghost" size="sm">
                <a
                  data-ignore-router-events="true"
                  data-testid="ignored-link"
                  href="/about?via=ignored"
                >
                  Ignored document link
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  data-testid="blank-link"
                  href="/about?via=blank"
                  target="_blank"
                  rel="noreferrer"
                >
                  _blank link
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a data-testid="external-link" href="https://example.com/">
                  External link
                </a>
              </Button>
            </nav>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 pb-32">
          {children}
          <RouterControls />
        </main>
      </div>
      <RouteEventLog />
      <UnsavedChangesDialog />
    </TodoStoreProvider>
  )
}

function RouterControls() {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Router controls</CardTitle>
        <CardDescription>
          These buttons use the `useRouter` wrapper from nextjs-router-events.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          data-testid="router-push-insights"
          onClick={() => router.push('/insights?via=router-push')}
        >
          router.push insights
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="router-replace-about"
          onClick={() => router.replace('/about?via=router-replace')}
        >
          router.replace about
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="router-back"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="router-forward"
          onClick={() => router.forward()}
        >
          Forward
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}
