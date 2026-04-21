import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const navigationState = {
  pathname: '/page-1',
  search: '',
  router: {
    push: mock(() => {}),
    replace: mock(() => {}),
    back: mock(() => {}),
    forward: mock(() => {}),
  },
}

const createRouter = () => ({
  push: mock(() => {}),
  replace: mock(() => {}),
  back: mock(() => {}),
  forward: mock(() => {}),
})

mock.module('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(navigationState.search),
  useRouter: () => navigationState.router,
}))

const { RouteChangesProvider, useRouteChangeEvents, useRouter } = await import('../index')
const { useFreezeRequestsContext } = await import('../context')

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  navigationState.pathname = '/page-1'
  navigationState.search = ''
  navigationState.router = createRouter()
  window.history.replaceState({}, '', '/page-1')
})

const formatEvent = (
  stage: 'before' | 'start' | 'complete',
  targetUrl: string,
  detail: { source: string; requestId: string; delta?: number }
) => `${stage}:${detail.source}:${detail.requestId}:${detail.delta ?? 'na'}:${targetUrl}`

const renderWithProvider = (ui: React.ReactElement) =>
  render(<RouteChangesProvider>{ui}</RouteChangesProvider>)

const commitLocation = (
  view: ReturnType<typeof render>,
  ui: React.ReactElement,
  nextUrl: string
) => {
  const url = new URL(nextUrl, 'http://localhost')

  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
  navigationState.pathname = url.pathname
  navigationState.search = url.search.startsWith('?') ? url.search.slice(1) : ''

  view.rerender(<RouteChangesProvider>{ui}</RouteChangesProvider>)
}

const SequenceHarness = () => {
  const router = useRouter()
  const [events, setEvents] = React.useState<string[]>([])

  useRouteChangeEvents({
    onBeforeRouteChange: (targetUrl, detail) => {
      setEvents((current) => [...current, formatEvent('before', targetUrl, detail)])
      return true
    },
    onRouteChangeStart: (targetUrl, detail) => {
      setEvents((current) => [...current, formatEvent('start', targetUrl, detail)])
    },
    onRouteChangeComplete: (targetUrl, detail) => {
      setEvents((current) => [...current, formatEvent('complete', String(targetUrl), detail)])
    },
  })

  return (
    <div>
      <button type="button" onClick={() => router.push('/page-2?via=push')}>
        push
      </button>
      <button type="button" onClick={() => router.replace('/page-3?via=replace')}>
        replace
      </button>
      <output data-testid="events">{events.join('|')}</output>
    </div>
  )
}

const FreezeCountProbe = ({ label }: { label: string }) => {
  const { freezeRequests } = useFreezeRequestsContext()
  useRouteChangeEvents({})

  return <output data-testid={label}>{freezeRequests.length}</output>
}

const AnchorProbe = () => {
  const [beforeCount, setBeforeCount] = React.useState(0)

  useRouteChangeEvents({
    onBeforeRouteChange: () => {
      setBeforeCount((current) => current + 1)
      return false
    },
  })

  return (
    <div>
      <a href="/page-2">Internal</a>
      <a href="/page-1" onClick={(event) => event.preventDefault()}>
        Same path and search
      </a>
      <a download="report.txt" href="/page-3" onClick={(event) => event.preventDefault()}>
        Download
      </a>
      <a
        data-ignore-router-events="true"
        href="/page-3"
        onClick={(event) => event.preventDefault()}
      >
        Ignored
      </a>
      <a href="/page-3" target="_blank" onClick={(event) => event.preventDefault()}>
        Blank
      </a>
      <a href="https://example.com/" onClick={(event) => event.preventDefault()}>
        External
      </a>
      <output data-testid="before-count">{beforeCount}</output>
    </div>
  )
}

const MultiBlockHarness = () => {
  const router = useRouter()
  const [events, setEvents] = React.useState<string[]>([])
  const [pendingA, setPendingA] = React.useState<string | null>(null)
  const [pendingB, setPendingB] = React.useState<string | null>(null)

  const { allowRouteChange: allowA } = useRouteChangeEvents({
    onBeforeRouteChange: (_, detail) => {
      setPendingA(detail.requestId)
      setEvents((current) => [...current, `before-a:${detail.requestId}`])
      return false
    },
    onRouteChangeStart: (_, detail) => {
      setEvents((current) => [...current, `start-a:${detail.requestId}:${detail.source}`])
    },
    onRouteChangeComplete: (targetUrl, detail) => {
      setEvents((current) => [
        ...current,
        `complete-a:${detail.requestId}:${detail.source}:${String(targetUrl)}`,
      ])
    },
  })

  const { allowRouteChange: allowB } = useRouteChangeEvents({
    onBeforeRouteChange: (_, detail) => {
      setPendingB(detail.requestId)
      setEvents((current) => [...current, `before-b:${detail.requestId}`])
      return false
    },
  })

  return (
    <div>
      <button type="button" onClick={() => router.push('/page-2?via=multi')}>
        push
      </button>
      <button
        type="button"
        onClick={() => {
          allowA()
          setPendingA(null)
        }}
      >
        allow-a
      </button>
      <button
        type="button"
        onClick={() => {
          allowB()
          setPendingB(null)
        }}
      >
        allow-b
      </button>
      <output data-testid="pending-a">{pendingA ?? 'none'}</output>
      <output data-testid="pending-b">{pendingB ?? 'none'}</output>
      <output data-testid="events">{events.join('|')}</output>
    </div>
  )
}

const HistoryMethodHarness = () => {
  const router = useRouter()
  const [events, setEvents] = React.useState<string[]>([])

  useRouteChangeEvents({
    onBeforeRouteChange: (_, detail) => {
      setEvents((current) => [...current, detail.source])
      return false
    },
  })

  return (
    <div>
      <button type="button" onClick={() => router.back()}>
        back
      </button>
      <button type="button" onClick={() => router.forward()}>
        forward
      </button>
      <output data-testid="events">{events.join('|')}</output>
    </div>
  )
}

describe('RouteChangesProvider', () => {
  test('keeps freeze registration scoped to each provider instance', () => {
    render(
      <>
        <RouteChangesProvider>
          <FreezeCountProbe label="provider-a" />
        </RouteChangesProvider>
        <RouteChangesProvider>
          <FreezeCountProbe label="provider-b" />
        </RouteChangesProvider>
      </>
    )

    expect(screen.getByTestId('provider-a').textContent).toBe('1')
    expect(screen.getByTestId('provider-b').textContent).toBe('1')
  })

  test('only manages internal anchors without opt-out, same-url, download, target blank, or external cases', () => {
    renderWithProvider(<AnchorProbe />)

    fireEvent.click(screen.getByText('Internal'))
    fireEvent.click(screen.getByText('Same path and search'))
    fireEvent.click(screen.getByText('Download'))
    fireEvent.click(screen.getByText('Ignored'))
    fireEvent.click(screen.getByText('Blank'))
    fireEvent.click(screen.getByText('External'))

    expect(screen.getByTestId('before-count').textContent).toBe('1')
  })

  test('emits before, start, and complete with preserved metadata for router.push and router.replace', () => {
    const origin = window.location.origin
    const ui = <SequenceHarness />
    const view = renderWithProvider(ui)

    fireEvent.click(screen.getByText('push'))
    expect(navigationState.router.push).toHaveBeenCalledTimes(1)

    commitLocation(view, ui, 'http://localhost/page-2?via=push')

    const pushEvents = screen.getByTestId('events').textContent?.split('|') ?? []
    const pushRequestId = pushEvents[0]?.split(':')[2]

    expect(pushEvents).toEqual([
      `before:router.push:${pushRequestId}:na:/page-2?via=push`,
      `start:router.push:${pushRequestId}:na:/page-2?via=push`,
      `complete:router.push:${pushRequestId}:na:${origin}/page-2?via=push`,
    ])

    fireEvent.click(screen.getByText('replace'))
    expect(navigationState.router.replace).toHaveBeenCalledTimes(1)

    commitLocation(view, ui, 'http://localhost/page-3?via=replace')

    const allEvents = screen.getByTestId('events').textContent?.split('|') ?? []
    const replaceEvents = allEvents.slice(3)
    const replaceRequestId = replaceEvents[0]?.split(':')[2]

    expect(replaceEvents).toEqual([
      `before:router.replace:${replaceRequestId}:na:/page-3?via=replace`,
      `start:router.replace:${replaceRequestId}:na:/page-3?via=replace`,
      `complete:router.replace:${replaceRequestId}:na:${origin}/page-3?via=replace`,
    ])
  })

  test('waits for every blocking listener to approve before resuming a pending navigation', () => {
    const origin = window.location.origin
    const ui = <MultiBlockHarness />
    const view = renderWithProvider(ui)

    fireEvent.click(screen.getByText('push'))

    const requestId = screen.getByTestId('pending-a').textContent

    expect(requestId).not.toBe('none')
    expect(screen.getByTestId('pending-b').textContent).toBe(requestId)
    expect(navigationState.router.push).toHaveBeenCalledTimes(0)

    fireEvent.click(screen.getByText('allow-a'))
    expect(navigationState.router.push).toHaveBeenCalledTimes(0)

    fireEvent.click(screen.getByText('allow-b'))
    expect(navigationState.router.push).toHaveBeenCalledTimes(1)

    commitLocation(view, ui, 'http://localhost/page-2?via=multi')

    expect(screen.getByTestId('events').textContent).toContain(`before-a:${requestId}`)
    expect(screen.getByTestId('events').textContent).toContain(`before-b:${requestId}`)
    expect(screen.getByTestId('events').textContent).toContain(
      `complete-a:${requestId}:router.push:${origin}/page-2?via=multi`
    )
  })

  test('lets router.back and router.forward wait for the popstate layer before firing lifecycle callbacks', () => {
    renderWithProvider(<HistoryMethodHarness />)

    fireEvent.click(screen.getByText('back'))
    fireEvent.click(screen.getByText('forward'))

    expect(navigationState.router.back).toHaveBeenCalledTimes(1)
    expect(navigationState.router.forward).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('events').textContent).toBe('')
  })
})
