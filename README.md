# nextjs-router-events

A router events alternative for the Next.js App Router, with route lifecycle hooks and support for guarded navigation.

## Motivation

The Pages Router exposed router events that could be used to track navigation and block a route change while the app asked for confirmation. The App Router does not provide the same API.

`nextjs-router-events` provides a small client-side layer for common App Router navigation flows: internal links, wrapped router methods, and browser history traversal.

## Installation

```sh
npm install nextjs-router-events
```

Peer dependencies are Next.js `^13 || ^14 || ^15 || ^16`, React `^18 || ^19`, and React DOM `^18 || ^19`.

## Setup

Wrap your application with `RouteChangesProvider` in `app/layout.tsx`.

```tsx
import { RouteChangesProvider } from 'nextjs-router-events'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RouteChangesProvider>{children}</RouteChangesProvider>
      </body>
    </html>
  )
}
```

Use the package `useRouter` wrapper when navigating programmatically.

```tsx
import { useRouter } from 'nextjs-router-events'
```

The wrapper keeps the App Router API shape and adds route-event handling for `push`, `replace`, `back`, and `forward`.
Other router methods, such as `refresh`, pass through without route-event handling.

## API

### `RouteChangesProvider`

```tsx
<RouteChangesProvider>{children}</RouteChangesProvider>
```

By default, the provider watches same-tab internal anchors except links marked with `data-ignore-router-events="true"`.

You can customize which anchors are managed with `getAnchorChildren`.

```tsx
<RouteChangesProvider
  getAnchorChildren={(node) => node.querySelectorAll('a[href]:not([data-skip-router-events])')}
>
  {children}
</RouteChangesProvider>
```

### `useRouteChangeEvents`

```tsx
const { allowRouteChange } = useRouteChangeEvents({
  onBeforeRouteChange: (targetUrl, detail) => {
    if (!formIsDirty) return true

    setPendingNavigation(detail)
    return false
  },
  onRouteChangeStart: (targetUrl, detail) => {
    startProgress(detail.source, targetUrl)
  },
  onRouteChangeComplete: (targetUrl, detail) => {
    finishProgress(detail.source, targetUrl)
  },
})
```

Callbacks:

- `onBeforeRouteChange(targetUrl, detail)` runs before a managed navigation is allowed to continue. Return `false` to block it.
- `onRouteChangeStart(targetUrl, detail)` runs when the managed navigation commits.
- `onRouteChangeComplete(targetUrl, detail)` runs after the App Router location changes.

`allowRouteChange()` resumes the navigation most recently blocked by that hook.

`detail` contains:

- `requestId`
- `targetUrl`
- `source`: `anchor`, `router.push`, `router.replace`, `router.back`, `router.forward`, or `popstate`
- `delta` for history traversal events

## Managed Navigations

The package manages:

- internal same-tab anchor navigations
- `router.push(...)`
- `router.replace(...)`
- browser back and forward
- `router.back()` and `router.forward()`

The package intentionally ignores:

- external links
- links with `target="_blank"`
- download links
- modifier-click navigation
- same-page anchor/hash navigation
- links marked with `data-ignore-router-events="true"`
- refresh, tab close, and full-page unload flows

Use a separate `beforeunload` handler if you also need to guard refresh or tab close.

## Unsaved Changes Example

```tsx
'use client'

import { useState } from 'react'
import { useRouteChangeEvents, type RouteChangeDetail } from 'nextjs-router-events'

export function useLeaveConfirmation(isDirty: boolean) {
  const [pendingNavigation, setPendingNavigation] = useState<RouteChangeDetail | null>(null)

  const { allowRouteChange } = useRouteChangeEvents({
    onBeforeRouteChange: (_targetUrl, detail) => {
      if (!isDirty) return true

      setPendingNavigation(detail)
      return false
    },
    onRouteChangeComplete: () => {
      setPendingNavigation(null)
    },
  })

  return {
    pendingNavigation,
    cancelNavigation: () => setPendingNavigation(null),
    confirmNavigation: () => {
      allowRouteChange()
      setPendingNavigation(null)
    },
  }
}
```

Render your own dialog when `pendingNavigation` is set. Call `confirmNavigation` to continue or `cancelNavigation` to stay on the page.

For refresh and tab-close protection, add browser-native unload handling alongside the route guard:

```tsx
import { useEffect } from 'react'

export function useBeforeUnload(shouldPreventUnload: boolean) {
  useEffect(() => {
    if (!shouldPreventUnload) return

    const abortController = new AbortController()

    window.addEventListener(
      'beforeunload',
      (event) => {
        event.preventDefault()
        event.returnValue = ''
      },
      { capture: true, signal: abortController.signal }
    )

    return () => abortController.abort()
  }, [shouldPreventUnload])
}
```

## Example App

This repository includes a Next.js example app under `apps/example`. It demonstrates guarded todo drafts, route-event driven progress, browser history handling, external link handling, and Playwright coverage for the supported navigation flows.
