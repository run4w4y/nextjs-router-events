import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration notes</CardTitle>
        <CardDescription>
          The example app demonstrates how the package fits into a complete dirty-form leave guard.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
        <p>
          The todo editor keeps an editable MobX Keystone draft next to the saved todo item. When
          the two diverge, the unsaved draft hook returns false from onBeforeRouteChange and shows a
          confirmation dialog.
        </p>
        <p>
          Refresh, tab close, and full document unloads are not Next App Router route changes. The
          demo handles those with a beforeunload listener, while same-tab external links are caught
          by a small document-link guard before the browser leaves the app.
        </p>
        <p>
          The progress bar listens only to routeChangeStart and routeChangeComplete, so it works for
          anchors, router.push, router.replace, router.back, router.forward, and browser history.
        </p>
      </CardContent>
    </Card>
  )
}
