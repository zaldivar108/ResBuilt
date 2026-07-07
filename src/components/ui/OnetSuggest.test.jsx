import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnetSuggest from './OnetSuggest'

// Find the AI-proxy call among all fetches (picking an occupation also fetches
// from the O*NET proxy, so we can't assume the AI call is call index 0).
function aiCall() {
  return globalThis.fetch.mock.calls.find(c => String(c[0]).includes('/api/ai'))
}

beforeEach(() => {
  vi.restoreAllMocks()
  // Default: the O*NET proxy is unreachable, so picking falls back to the seed.
  // Individual tests override fetch for the AI (polish) call.
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
})

// Search shows seed results instantly; picking is async (tries the live proxy,
// falls back to the seed) so wait for the picked job's duties to render.
async function searchAndPickCashier() {
  fireEvent.change(screen.getByLabelText(/find your job/i), { target: { value: 'cashier' } })
  fireEvent.click(screen.getByRole('button', { name: /cashiers/i }))
  await screen.findByText(/receive and process payments/i)
}

describe('OnetSuggest', () => {
  test('searches real occupations and shows the picked job’s real tasks', async () => {
    render(<OnetSuggest onApply={() => {}} />)
    await searchAndPickCashier()
    // A real O*NET cashier duty from the seed.
    expect(screen.getByText(/receive and process payments/i)).toBeInTheDocument()
  })

  test('"Add selected" inserts checked duties verbatim, without calling the AI', async () => {
    const onApply = vi.fn()
    render(<OnetSuggest onApply={onApply} />)
    await searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /add selected/i }))

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply.mock.calls[0][0]).toMatch(/^<ul><li>Receive and process payments/)
    expect(aiCall()).toBeUndefined() // no /api/ai request
  })

  test('"Add selected" is disabled until a duty is checked', async () => {
    render(<OnetSuggest onApply={() => {}} />)
    await searchAndPickCashier()
    expect(screen.getByRole('button', { name: /add selected/i })).toBeDisabled()
  })

  test('"Make it mine" sends checked duties to the polish task and applies the result', async () => {
    const onApply = vi.fn()
    // Reject the O*NET pick (fall back to seed), resolve the AI polish call.
    vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      if (String(url).includes('/api/ai')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ result: '<ul><li>Processed cash and card payments accurately.</li></ul>' }),
        })
      }
      return Promise.reject(new Error('offline'))
    })
    render(<OnetSuggest onApply={onApply} />)
    await searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /make it mine/i }))

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.stringContaining('Processed cash and card')))
    const body = JSON.parse(aiCall()[1].body)
    expect(body.task).toBe('polish')
    expect(body.text).toContain('Receive and process payments')
  })

  test('surfaces an AI error without applying', async () => {
    const onApply = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      if (String(url).includes('/api/ai')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'The AI service is busy right now — try again in a moment.' }),
        })
      }
      return Promise.reject(new Error('offline'))
    })
    render(<OnetSuggest onApply={onApply} />)
    await searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /make it mine/i }))

    expect(await screen.findByText(/busy right now/i)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})
