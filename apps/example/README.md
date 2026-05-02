# Example App

A small Next.js App Router application demonstrating `nextjs-router-events` in a todo editor with unsaved draft protection.

The app shows how to:

- block internal route changes until the user confirms they want to leave
- listen to route lifecycle events for links, browser history, and wrapped router methods
- drive a progress indicator and event log from route events
- handle refresh, tab close, external links, and ignored document links outside the package route-event flow

## Run Locally

Install dependencies from the repository root:

```sh
bun install
```

Start the example app:

```sh
bun --cwd apps/example dev
```

Run the Playwright e2e suite:

```sh
bun --cwd apps/example test:e2e
```

## Useful Files

- `src/app/layout.tsx` sets up `RouteChangesProvider`.
- `src/app/_lib/example-shell.tsx` contains the navigation, router controls, progress bar, event log, and confirmation dialog.
- `src/app/todos/_lib/todo-studio.tsx` contains the todo editor for the `/todos` route.
- `src/app/insights/_lib/insights-panel.tsx` contains the derived todo metrics for the `/insights` route.
- `src/app/_lib/use-leave-confirmation.ts` connects route guards to the unsaved-changes dialog.
- `src/app/_lib/use-before-unload.ts` handles refresh and tab-close confirmation.
- `src/app/_lib/use-route-progress.ts` updates the top progress indicator from route lifecycle events.
- `src/features/todos/todo-store.ts` defines the MobX Keystone todo store used by the demo.
- `e2e/navigation.spec.ts` covers the navigation and leave-confirmation scenarios.

## Navigation Coverage

`nextjs-router-events` manages App Router navigation, including internal links, `router.push`, `router.replace`, browser back and forward, `router.back()`, and `router.forward()`.

Browser refreshes, tab closes, external links, `_blank` links, and links marked with `data-ignore-router-events="true"` are not App Router transitions. The example handles the relevant cases separately at the application layer.
