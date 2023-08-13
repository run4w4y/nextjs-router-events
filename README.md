# nextjs-router-events
A router events alternative for Next.js 13+ with app directory with the ability to prevent user navigation.

# Disclaimer
Initially I wrote this as a workaround for my project needs, and it worked fine in my case. However,
that does not mean it is production-ready. As such, do NOT use this package in production, unless you absolutely must. In case you do, you do so at your own risk.

If you've found a bug or have suggestions regarding this package, feel free to open an issue/pull request.

# Motivation
Before app directory, Next.js provided developers with the ability to not only track route changes, but also to prevent the user from navigating to another page with router events. Unfortunately, I have not found an official solution for either of those. While I have seen some other community provided workarounds for the former use-case, I have not found one for the latter, so here we are. 

I certainly hope we get official support for both of these use-cases and this package becomes redundant, but meanwhile you can use this.

# Installation
Install the package from npm
```
npm install nextjs-router-events
```

# Caveats
What this package does, is basically attach `click` event listeners to all `a` nodes in the DOM, and from there handle the necessary logic for the route change events. As it is, the package will be treating **all** `a` node clicks as events of navigation, whether it is an anchor link, an external link or an internal link. It also does not check what the `a` node `target` attribute is, so route change events will be triggered for `target="_blank"` as well (except `routeChangeEnd`). As such, you should be keeping that in mind when using this package with things like `nprogress`.

This package also only handles `router.push`, so all other `router` methods such as `back`, `forward`, `refresh` and etc are not covered.
I do plan on covering more `router` methods where it is possible to do so, as well as offering some sort of opt-out for the `a` nodes in the DOM, however at the moment it is what it is.

# Setup
The package exports `RouteChangesProvider`, use it inside your `layout` like so
```typescript
// layout.tsx
import React from 'react'
import { RouteChangesProvider } from 'nextjs-router-events'

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <RouteChangesProvider>
            {children}
        </RouteChangesProvider>
    )
}

export default Layout
```

After that, if you're using `router.push` in your application you probably also want to replace your `useRouter` from `next/navigation` usage with `useRouter` exported by this package
```typescript
import { useRouter } from 'nextjs-router-events'
``` 

If you find it tedious to go through your imports, you could probably use `resolve.alias` in your webpack configuration to just alias `next/navigation` to something that re-exports all of its contents, except for the `useRouter` and instead exports the one from this package.

# API

Aside from the `useRouter` (which has the exact same API as the one from `next/navigation`) and `RouteChangesProvider` (whose only prop is `children`), the package exports `useRouteChangeEvents` hook. 

## `useRouteChangeEvents` props
- `onBeforeRouteChange?: (target: string) => boolean | void` - optional, this function will be called every time **before** the navigation takes place. It takes one argument: the target (for example, `href` attribute of the `a` tag the user clicked) and should return either `undefined` or a `boolean`. If the function returned `true` or `undefined`, the navigation proceeds. If the function returned `false`, the navigation is prevented until `allowRouteChange` (read further) is called.
- `onRouteChangeStart?: (target: string) => void` - optional, this function will be called every time **after** the navigation has already started. Similarly to `onBeforeRouteChange`, the function also receives `target` as its argument.
- `onRouteChangeComplete?: (target: HistoryURL) => void` - optional as well, this will be called every time **after** the navigation has ended. This function also receives `target`, but now instead of just `string` it has the type signature of `string | URL | null | undefined`. 

## `useRouteChangeEvents` return value
It returns an object that only contains the `allowRouteChange: () => void` function mentioned before. You should only use it after preventing a user navigation, in case there wasn't any navigation prevented prior to calling it nothing really will happen, although you're going to receive a warning in your console.

# Examples

## Preventing user from leaving a page with unsaved changes
Define a `useLeaveConfirmation` hook like this 
```typescript
import { useCallback, useState } from "react"
import { useRouteChangeEvents } from "nextjs-router-events"
import useBeforeUnload from './useBeforeUnload' // read further for an explanation
import { 
  AlertDialog, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alertDialog" // this is just radix-ui Alert Dialog, replace it with whatever fits your project

const useLeaveConfirmation = (shouldPreventRouteChange: boolean) => {
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const onBeforeRouteChange = useCallback(() => {
    if (shouldPreventRouteChange) {
      setShowConfirmationDialog(true)
      return false
    }

    return true
  }, [shouldPreventRouteChange])

  const { allowRouteChange } = useRouteChangeEvents({ onBeforeRouteChange })
  // this is technically unrelated to this package, but probably still is something you might want to do
  useBeforeUnload(shouldPreventRouteChange)

  return {
    confirmationDialog: (
      <AlertDialog 
        open={showConfirmationDialog} 
        onOpenChange={setShowConfirmationDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              You have unsaved changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure, you want to leave? 
              All the unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              allowRouteChange()
            }}>
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
}

export default useLeaveConfirmation
```

Now, you can use this hook in a component like this (this is not actual working code, just an example)
```typescript
import useLeaveConfirmation from '@/hooks/useLeaveConfirmation'
import { useStore } from '@/store'

const Component = () => {
    const store = useStore() // your hypothetical application state
    // below replace `store.isDirty` with whatever logic to determine whether or not your application state has been modified by the user
    const { confirmationDialog } = useLeaveConfirmation(store.isDirty()) 

    // render the confirmationDialog somewhere
    return (
        <>
            ...
            {confirmationDialog}
            ...
        </>
    )
}
```

### Note
Since you are trying to prevent the user from leaving, you probably also want to cover the cases where user "leaves" using browser-native navigation methods such as back button or page refresh. In case you do, you might as well use `useBeforeUnload` hook within `useLeaveConfirmation`. The hook can be defined like this:
```typescript
import { useEffect } from "react"

// NOTE: although there is a message argument, you really should not be relying on it, as most, if not all, modern browsers completely ignore it anyways
const useBeforeUnload = (shouldPreventUnload: boolean, message?: string) => {
  useEffect(() => {
    const abortController = new AbortController()

    if (shouldPreventUnload)
      window.addEventListener('beforeunload', (ev) => {
        ev.preventDefault()

        return (ev.returnValue = message ?? '')
      }, { capture: true, signal: abortController.signal })

    return () => abortController.abort()
  }, [shouldPreventUnload, message])
}

export default useBeforeUnload
```
