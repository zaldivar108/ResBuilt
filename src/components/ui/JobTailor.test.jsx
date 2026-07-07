import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobTailor from './JobTailor'

const section = { content: '<p>I sold things at a shop</p>' }

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

function typePosting(text = 'Retail associate: POS, inventory, customer service') {
  fireEvent.change(screen.getByLabelText(/paste a job posting/i), { target: { value: text } })
}

function mockFetch(payload, ok = true) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => payload })
}

describe('JobTailor', () => {
  test('analyze renders matched, missing, and suggestions', async () => {
    mockFetch({ result: JSON.stringify({
      matched: ['customer service'],
      missing: ['POS', 'inventory'],
      suggestions: ['Operated point-of-sale registers'],
    }) })
    render(<JobTailor section={section} onApply={() => {}} />)
    typePosting()
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))

    expect(await screen.findByText('customer service')).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText(/operated point-of-sale/i)).toBeInTheDocument()
  })

  test('adding a suggestion appends a bullet to the section', async () => {
    mockFetch({ result: JSON.stringify({ matched: [], missing: [], suggestions: ['Trained new hires'] }) })
    const onApply = vi.fn()
    render(<JobTailor section={section} onApply={onApply} />)
    typePosting()
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))

    fireEvent.click(await screen.findByRole('button', { name: /add/i }))
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('<li>Trained new hires</li>'))
    expect(onApply.mock.calls[0][0]).toContain('I sold things') // appended, not replaced
  })

  test('rewrite replaces the section with grounded HTML', async () => {
    const onApply = vi.fn()
    // First call: analysis. Second: retarget rewrite.
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: JSON.stringify({ matched: ['a'], missing: [], suggestions: [] }) }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: '<p>Sold merchandise and served customers at a retail shop.</p>' }) })
    render(<JobTailor section={section} onApply={onApply} />)
    typePosting()
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))
    fireEvent.click(await screen.findByRole('button', { name: /rewrite this section/i }))

    await waitFor(() => expect(onApply).toHaveBeenCalledWith(expect.stringContaining('Sold merchandise')))
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body).task).toBe('retarget')
  })

  test('shows an error and does not analyze on failure', async () => {
    mockFetch({ error: 'The AI service is busy right now — try again in a moment.' }, false)
    render(<JobTailor section={section} onApply={() => {}} />)
    typePosting()
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))
    expect(await screen.findByText(/busy right now/i)).toBeInTheDocument()
  })
})
