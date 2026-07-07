// Client helper for streaming AI responses (Server-Sent Events from the proxy,
// which pipes Groq's stream through). The SSE parsing bits are pure and tested;
// streamAiTask wires them to fetch + a ReadableStream reader.

/** Parse one SSE `data:` line into a content token or the done sentinel. */
export function extractDelta(line) {
  const s = line.replace(/^data:\s*/, '').trim()
  if (s === '[DONE]') return { done: true }
  if (!s) return { content: '' }
  try {
    const json = JSON.parse(s)
    return { content: json.choices?.[0]?.delta?.content ?? '' }
  } catch {
    return { content: '' }
  }
}

/** Split a buffer into complete SSE events plus the trailing partial ("rest"). */
export function splitSse(buffer) {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  return { events: parts, rest }
}

/**
 * Stream an AI task, invoking onDelta(cumulativeText) as tokens arrive.
 * Falls back to a buffered JSON response if the server didn't stream.
 * @param {object} payload - the task payload sent to /api/ai
 * @param {(text: string) => void} onDelta - called with cumulative text
 * @param {{ signal?: AbortSignal }} [opts] - pass a signal to cancel the request
 * @returns {Promise<string>} the full text
 * @throws {Error} with a user-friendly message on HTTP or network failure
 */
export async function streamAiTask(payload, onDelta, { signal } = {}) {
  let res
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('Could not reach the AI. If running locally, use `vercel dev`.', { cause: err })
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Something went wrong. Try again.')
  }

  const contentType = res.headers.get('Content-Type') || ''
  // Server chose not to stream (or the environment can't) — read it whole.
  if (!res.body || !contentType.includes('event-stream')) {
    const data = await res.json().catch(() => ({}))
    const result = data.result || ''
    if (result) onDelta(result)
    return result
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = splitSse(buffer)
    buffer = rest
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue
        const delta = extractDelta(line)
        if (delta.done) return full
        if (delta.content) {
          full += delta.content
          onDelta(full)
        }
      }
    }
  }
  return full
}
