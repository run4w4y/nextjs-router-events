import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const behaviors = [
  {
    title: 'Internal App Router navigation',
    description:
      'Edit the todo draft, then use the Todos, Insights, About, or router buttons. The package pauses the route change and the app shows a confirmation dialog.',
  },
  {
    title: 'Refresh, tab close, and full-page unload',
    description:
      'With a dirty draft, refresh the page or close the tab. Browsers only allow their native beforeunload dialog for this case, so the demo uses that instead of a custom modal.',
  },
  {
    title: 'External and ignored document links',
    description:
      'Same-tab external links and data-ignore-router-events document links are not package-managed route events, so the app-level leave-confirmation hook catches them separately.',
  },
  {
    title: 'Progress and event feed',
    description:
      'The top progress bar and event feed are driven by routeChangeStart and routeChangeComplete. They intentionally do not log refresh or external document unloads.',
  },
]

export default function OverviewPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>What this demo shows</CardTitle>
          <CardDescription>
            This is the reference app for using nextjs-router-events with a dirty todo draft.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            The package covers managed App Router navigation: internal links, router.push,
            router.replace, browser back/forward, and router.back/router.forward. The app adds the
            surrounding leave-page behavior that real forms usually need: beforeunload for refresh
            and a document-link guard for same-tab external links.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/todos">Try the todo editor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/about">Read integration notes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {behaviors.map((behavior) => (
          <Card key={behavior.title}>
            <CardHeader>
              <CardTitle className="text-lg">{behavior.title}</CardTitle>
              <CardDescription>{behavior.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
