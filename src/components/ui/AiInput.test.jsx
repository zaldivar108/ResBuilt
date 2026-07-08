import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AiProvider, AiWorkspace, useAi } from './AiInput'

// Drives runFragmentTask directly — the capture/verify mechanics themselves
// are covered by selectionRange.test.js and EditorToolbar.test.jsx; this file
// is about AiProvider's own apply/re-apply state machine.
function Driver({ captured }) {
  const { runFragmentTask } = useAi()
  return <button onClick={() => runFragmentTask(captured)}>run-fragment</button>
}

function Harness({ onApplyRange, onApply, captured }) {
  return (
    <AiProvider
      section={{ id: 'sec1', type: 'experience', content: '<p>Helped customers today</p>' }}
      onApply={onApply}
      onApplyRange={onApplyRange}
    >
      <Driver captured={captured} />
      <AiWorkspace />
    </AiProvider>
  )
}

function mockFetch(result) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => ({ result }),
  })
}

const captured = {
  sectionId: 'sec1',
  contentSnapshot: '<p>Helped customers today</p>',
  startOffset: 7,
  endOffset: 16,
  text: 'customers',
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('AiWorkspace — fragment apply safety (regression)', () => {
  test('a second click on a just-applied fragment result does not fall through to a whole-section replace', async () => {
    mockFetch('clients')
    const onApplyRange = vi.fn(() => ({ ok: true }))
    const onApply = vi.fn()
    render(<Harness onApplyRange={onApplyRange} onApply={onApply} captured={captured} />)

    fireEvent.click(screen.getByText('run-fragment'))
    fireEvent.click(await screen.findByRole('button', { name: /apply to section/i }))
    expect(onApplyRange).toHaveBeenCalledTimes(1)
    expect(onApplyRange).toHaveBeenCalledWith(captured, 'clients')

    // Rapid second click, before the "Applied ✓" flash clears — must be inert.
    const appliedBtn = screen.getByRole('button', { name: /applied/i })
    fireEvent.click(appliedBtn)
    expect(onApplyRange).toHaveBeenCalledTimes(1) // still just once
    expect(onApply).not.toHaveBeenCalled() // never treated as a whole-section replace
  })

  test('the result panel clears after the apply flash — Apply cannot be clicked a third time', async () => {
    vi.useFakeTimers()
    try {
      mockFetch('clients')
      const onApplyRange = vi.fn(() => ({ ok: true }))
      render(<Harness onApplyRange={onApplyRange} onApply={() => {}} captured={captured} />)

      fireEvent.click(screen.getByText('run-fragment'))
      // Flush the fetch microtask under fake timers.
      await act(async () => { await Promise.resolve(); await Promise.resolve() })

      fireEvent.click(screen.getByRole('button', { name: /apply to section/i }))
      act(() => { vi.advanceTimersByTime(1500) })

      expect(screen.queryByRole('button', { name: /apply to section|applied/i })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  test('a refused (stale) apply surfaces a friendly error and clears the fragment capture', async () => {
    mockFetch('clients')
    const onApplyRange = vi.fn(() => ({ ok: false, reason: 'stale' }))
    const onApply = vi.fn()
    render(<Harness onApplyRange={onApplyRange} onApply={onApply} captured={captured} />)

    fireEvent.click(screen.getByText('run-fragment'))
    fireEvent.click(await screen.findByRole('button', { name: /apply to section/i }))

    expect(await screen.findByText(/reselect and try again/i)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})
