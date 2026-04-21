import { describe, expect, test } from 'bun:test'
import { createRouteChangeDetail } from '../events'

describe('createRouteChangeDetail', () => {
  test('preserves metadata and generates unique request ids', () => {
    const first = createRouteChangeDetail({
      targetUrl: '/page-1',
      source: 'router.push',
    })
    const second = createRouteChangeDetail({
      targetUrl: '/page-2',
      source: 'anchor',
    })

    expect(first.requestId).toStartWith('nre-')
    expect(second.requestId).toStartWith('nre-')
    expect(first.requestId).not.toBe(second.requestId)
    expect(first.source).toBe('router.push')
    expect(second.targetUrl).toBe('/page-2')
  })

  test('keeps provided request ids and delta values intact', () => {
    const detail = createRouteChangeDetail({
      requestId: 'custom-request',
      targetUrl: '/page-2',
      source: 'popstate',
      delta: -1,
    })

    expect(detail.requestId).toBe('custom-request')
    expect(detail.source).toBe('popstate')
    expect(detail.delta).toBe(-1)
  })
})
