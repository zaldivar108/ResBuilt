import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnetSuggest from './OnetSuggest'

beforeEach(() => {
  vi.restoreAllMocks()
})

function searchAndPickCashier() {
  fireEvent.change(screen.getByLabelText(/find your job/i), { target: { value: 'cashier' } })
  fireEvent.click(screen.getByRole('button', { name: /cashiers/i }))
}

describe('OnetSuggest', () => {
  test('searches real occupations and shows the picked job’s real tasks', () => {
    render(<OnetSuggest onApply={() => {}} />)
    searchAndPickCashier()
    // A real O*NET cashier duty from the seed.
    expect(screen.getByText(/receive and process payments/i)).toBeInTheDocument()
  })

  test('"Add selected" inserts checked duties verbatim, no network', () => {
    const onApply = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<OnetSuggest onApply={onApply} />)
    searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /add selected/i }))

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply.mock.calls[0][0]).toMatch(/^<ul><li>Receive and process payments/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('"Add selected" is disabled until a duty is checked', () => {
    render(<OnetSuggest onApply={() => {}} />)
    searchAndPickCashier()
    expect(screen.getByRole('button', { name: /add selected/i })).toBeDisabled()
  })

  test('"Make it mine" sends checked duties to the polish task and applies the result', async () => {
    const onApply = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: '<ul><li>Processed cash and card payments accurately.</li></ul>' }),
    })
    render(<OnetSuggest onApply={onApply} />)
    searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /make it mine/i }))

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.stringContaining('Processed cash and card')))
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.task).toBe('polish')
    expect(body.text).toContain('Receive and process payments')
  })

  test('surfaces an AI error without applying', async () => {
    const onApply = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'The AI service is busy right now — try again in a moment.' }),
    })
    render(<OnetSuggest onApply={onApply} />)
    searchAndPickCashier()

    fireEvent.click(screen.getByText(/receive and process payments/i))
    fireEvent.click(screen.getByRole('button', { name: /make it mine/i }))

    expect(await screen.findByText(/busy right now/i)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})
