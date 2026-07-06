/* global process */
// Vercel Edge Function — server-side proxy to Groq's OpenAI-compatible API.
// The GROQ_API_KEY never reaches the browser. Set it as a Vercel env var
// (and in .env.local for `vercel dev`); see .env.example.

export const config = { runtime: 'edge' }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'
const MAX_INPUT = 2000
const MAX_TOKENS = 600

// One system prompt per supported task. Tailored for teen / young-adult
// first-time résumé writers — keep it truthful, concise, encouraging.
// The user sends the résumé section as simple HTML (<p>, <ul>, <li>, <strong>,
// <em>). Models must return HTML with the same structure — no markdown, no code
// fences, no commentary — so the result can be written straight back into the section.
const PROMPTS = {
  improve:
    'You improve one section of a first résumé for a teenager or young adult. The user sends the section as simple HTML. Rewrite for clarity and impact: strong action verbs, concise, honest — never invent experience, employers, numbers, or credentials. Preserve the HTML structure and the same tags (<p>, <ul>, <li>, <strong>, <em>). Return ONLY the improved HTML — no markdown, no code fences, no commentary.',
  ideas:
    'You help a teenager or young adult writing a first résumé. The user sends one résumé section as HTML for context. Suggest 3 short, realistic bullet points they could ADD, believable for someone with limited experience (school, part-time jobs, volunteering, activities) — never invent specific employers or achievements. Return ONLY an HTML fragment: a single <ul> with exactly three <li> items. No commentary, no code fences.',
  grammar:
    'Fix only spelling and grammar in the résumé section the user sends as HTML. Preserve the meaning, wording, tone, and every HTML tag and structure. Do not add or remove content. Return ONLY the corrected HTML — no markdown, no code fences, no commentary.',
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const key = process.env.GROQ_API_KEY
  if (!key) return json({ error: 'AI is not configured on the server.' }, 503)

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const { task, text } = body ?? {}
  if (!PROMPTS[task]) return json({ error: 'Unknown task.' }, 400)
  if (typeof text !== 'string' || !text.trim()) {
    return json({ error: 'Please enter some text first.' }, 400)
  }
  if (text.length > MAX_INPUT) {
    return json({ error: `Text is too long (max ${MAX_INPUT} characters).` }, 413)
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: PROMPTS[task] },
          { role: 'user', content: text.trim() },
        ],
      }),
    })

    if (!res.ok) {
      // Do not leak upstream error bodies (may echo the request) to the client.
      const status = res.status === 429 ? 429 : 502
      const error = status === 429
        ? 'The AI service is busy right now — try again in a moment.'
        : 'The AI service returned an error. Try again shortly.'
      return json({ error }, status)
    }

    const data = await res.json()
    const result = data?.choices?.[0]?.message?.content?.trim() ?? ''
    if (!result) return json({ error: 'No suggestion was returned. Try again.' }, 502)
    return json({ result })
  } catch {
    return json({ error: 'Could not reach the AI service. Check your connection.' }, 502)
  }
}
