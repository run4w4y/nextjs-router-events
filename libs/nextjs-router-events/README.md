# nextjs-router-events

`nextjs-router-events` adds route lifecycle hooks back to the Next.js App Router, including guarded navigation for internal links, `router.push`, `router.replace`, browser history, and `router.back()` / `router.forward()`.

## Installation

```bash
npm install nextjs-router-events
```

## Setup

Wrap your application with `RouteChangesProvider` in `app/layout.tsx`.

```tsx
import { RouteChangesProvider } from 'nextjs-router-events'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <RouteChangesProvider>{children}</RouteChangesProvider>
      </body>
    </html>
  )
}
```

Use the package router wrapper when you navigate programmatically.

```tsx
import { useRouter } from 'nextjs-router-events'
```

## API

### `useRouteChangeEvents`

```tsx
const { allowRouteChange } = useRouteChangeEvents({
  onBeforeRouteChange: (targetUrl, detail) => {
    if (formIsDirty) {
      setPendingTarget(detail)
      return false
    }

    return true
  },
  onRouteChangeStart: (targetUrl, detail) => {
    startProgress(detail.source, targetUrl)
  },
  onRouteChangeComplete: (targetUrl) => {
    finishProgress(String(targetUrl ?? ''))
  },
})
```

Callback details:

- `onBeforeRouteChange(targetUrl, detail)` runs before a managed navigation is allowed to continue.
- `onRouteChangeStart(targetUrl, detail)` runs when the managed navigation commits.
- `onRouteChangeComplete(targetUrl)` runs after the App Router location changes.
- `allowRouteChange()` resumes the last navigation that your hook blocked.

The exported `RouteChangeDetail` includes:

- `requestId`
- `targetUrl`
- `source`: one of `anchor`, `router.push`, `router.replace`, `router.back`, `router.forward`, or `popstate`
- `delta` for history traversals

## Managed vs ignored navigations

The package intentionally manages:

- internal anchor navigations
- `router.push(...)`
- `router.replace(...)`
- browser back and forward
- `router.back()` and `router.forward()`

The package intentionally ignores:

- external links
- links with `target="_blank"`
- links with `data-ignore-router-events="true"`
- modifier-click navigation
- refresh and full-page unload flows

Use a separate `beforeunload` hook if you also need to guard refresh or tab close.
