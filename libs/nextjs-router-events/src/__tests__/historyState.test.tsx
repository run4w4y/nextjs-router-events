import { describe, expect, test } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'
import { readMeta, useHistoryAugmentation } from '../historyState'

const HistoryProbe = () => {
  useHistoryAugmentation()
  return null
}

describe('useHistoryAugmentation', () => {
  test('writes token and index metadata into history state', () => {
    render(<HistoryProbe />)

    window.history.replaceState({}, '', '/page-1')
    const initialMeta = readMeta(window.history.state)
    const baseIndex = initialMeta?.index ?? 0

    expect(initialMeta).not.toBeNull()
    expect(initialMeta?.index).toBe(baseIndex)
    expect(initialMeta?.token).not.toBe('')

    window.history.pushState({ via: 'push' }, '', '/page-2')
    const pushedMeta = readMeta(window.history.state)

    expect(pushedMeta?.index).toBe(baseIndex + 1)
    expect(pushedMeta?.token).toBe(initialMeta?.token)

    window.history.replaceState({ via: 'replace' }, '', '/page-2?mode=replace')
    const replacedMeta = readMeta(window.history.state)

    expect(replacedMeta?.index).toBe(baseIndex + 1)
    expect(replacedMeta?.token).toBe(initialMeta?.token)
  })

  test('returns null for non-augmented history state payloads', () => {
    expect(readMeta(null)).toBeNull()
    expect(readMeta('invalid')).toBeNull()
    expect(readMeta({})).toBeNull()
    expect(readMeta({ __next_router_events_token: 'token' })).toBeNull()
    expect(readMeta({ __next_router_events_index: 1 })).toBeNull()
  })
})
