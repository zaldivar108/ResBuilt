import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobTailor from './JobTailor'

// Stub the quiz modal: the full 30-question flow is covered elsewhere; here we
// only need to drive its onPickCareer / onClose callbacks to test JobTailor's
// wiring (duty fetch + textarea prefill).
vi.mock('./InterestProfiler', () => ({
  default: ({ onPickCareer, onClose }) => (
    <div role="dialog" aria-label="quiz-stub">
      <button onClick={() => onPickCareer({ code: '35-3031.00', title: 'Waiters and Waitresses' })}>pick-career</button>
      <button onClick={onClose}>close-quiz</button>
    </div>
  ),
}))

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

describe('JobTailor — persisted targetJob (ADR 0004)', () => {
  test('hydrates the posting box from a persisted targetJob on mount', () => {
    render(<JobTailor section={section} onApply={() => {}} targetJob={{ text: 'Old saved posting', source: 'pasted' }} />)
    expect(screen.getByLabelText(/paste a job posting/i).value).toBe('Old saved posting')
  })

  test('with no targetJob, the posting box starts empty (old résumés behave as before)', () => {
    render(<JobTailor section={section} onApply={() => {}} />)
    expect(screen.getByLabelText(/paste a job posting/i).value).toBe('')
  })

  test('analyzing a manually-typed posting persists it with source "pasted"', async () => {
    mockFetch({ result: JSON.stringify({ matched: [], missing: [], suggestions: [] }) })
    const onSaveTargetJob = vi.fn()
    render(<JobTailor section={section} onApply={() => {}} onSaveTargetJob={onSaveTargetJob} />)
    typePosting('Cashier: register, customer service')
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))

    await waitFor(() => expect(onSaveTargetJob).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Cashier: register, customer service', source: 'pasted' })
    ))
  })

  test('picking a quiz career persists the target with source "quiz" and its title', async () => {
    mockFetch({ occupation: { title: 'Waiters and Waitresses', tasks: ['Serve food.'] } })
    const onSaveTargetJob = vi.fn()
    render(<JobTailor section={section} onApply={() => {}} onSaveTargetJob={onSaveTargetJob} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))

    await waitFor(() => expect(onSaveTargetJob).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'quiz', title: 'Waiters and Waitresses' })
    ))
  })

  test('re-analyzing an unedited quiz-sourced posting keeps source "quiz"', async () => {
    mockFetch({ occupation: { title: 'Waiters and Waitresses', tasks: ['Serve food.'] } })
    const onSaveTargetJob = vi.fn()
    render(<JobTailor section={section} onApply={() => {}} onSaveTargetJob={onSaveTargetJob} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))
    await waitFor(() => expect(screen.getByLabelText(/paste a job posting/i).value).toContain('Serve food.'))

    onSaveTargetJob.mockClear()
    mockFetch({ result: JSON.stringify({ matched: [], missing: [], suggestions: [] }) })
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))

    await waitFor(() => expect(onSaveTargetJob).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'quiz', title: 'Waiters and Waitresses' })
    ))
  })

  test('editing the posting after a quiz pick reverts provenance to "pasted"', async () => {
    mockFetch({ occupation: { title: 'Waiters and Waitresses', tasks: ['Serve food.'] } })
    const onSaveTargetJob = vi.fn()
    render(<JobTailor section={section} onApply={() => {}} onSaveTargetJob={onSaveTargetJob} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))
    await waitFor(() => expect(screen.getByLabelText(/paste a job posting/i).value).toContain('Serve food.'))

    typePosting('A manually edited posting')
    onSaveTargetJob.mockClear()
    mockFetch({ result: JSON.stringify({ matched: [], missing: [], suggestions: [] }) })
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }))

    await waitFor(() => expect(onSaveTargetJob).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'pasted', title: undefined })
    ))
  })

  test('"Clear target" empties the posting and clears the persisted target', () => {
    const onSaveTargetJob = vi.fn()
    render(<JobTailor section={section} onApply={() => {}} targetJob={{ text: 'Old posting', source: 'pasted' }} onSaveTargetJob={onSaveTargetJob} />)
    fireEvent.click(screen.getByRole('button', { name: /clear target/i }))

    expect(screen.getByLabelText(/paste a job posting/i).value).toBe('')
    expect(onSaveTargetJob).toHaveBeenCalledWith(null)
  })
})

describe('JobTailor — quiz-to-tailor bridge', () => {
  const box = () => screen.getByLabelText(/paste a job posting/i)

  test('the "Take the quiz" button opens the Interest Profiler', () => {
    render(<JobTailor section={section} onApply={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    expect(screen.getByRole('dialog', { name: 'quiz-stub' })).toBeInTheDocument()
  })

  test('picking a career prefills the posting with that job’s real O*NET duties', async () => {
    mockFetch({ occupation: { title: 'Waiters and Waitresses', tasks: ['Take orders from patrons.', 'Serve food and beverages.'] } })
    render(<JobTailor section={section} onApply={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))

    await waitFor(() => expect(box().value).toContain('Take orders from patrons.'))
    expect(box().value).toContain('Waiters and Waitresses')
    // modal closes after a pick
    expect(screen.queryByRole('dialog', { name: 'quiz-stub' })).not.toBeInTheDocument()
  })

  test('degrades to the job title (with a note) when duties can’t be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(<JobTailor section={section} onApply={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))

    await waitFor(() => expect(box().value).toBe('Waiters and Waitresses'))
    expect(screen.getByText(/couldn’t load full duties/i)).toBeInTheDocument()
  })

  test('a career pick replaces already-typed posting text and says so', async () => {
    mockFetch({ occupation: { title: 'Waiters and Waitresses', tasks: ['Serve food.'] } })
    render(<JobTailor section={section} onApply={() => {}} />)
    fireEvent.change(box(), { target: { value: 'some old pasted posting' } })
    fireEvent.click(screen.getByRole('button', { name: /take the quiz/i }))
    fireEvent.click(screen.getByRole('button', { name: 'pick-career' }))

    await waitFor(() => expect(box().value).toContain('Serve food.'))
    expect(box().value).not.toContain('some old pasted posting')
    expect(screen.getByText(/replaced with waiters and waitresses duties/i)).toBeInTheDocument()
  })
})
