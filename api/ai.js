/* global process */
// Vercel Edge Function — server-side proxy to Groq's OpenAI-compatible API.
// The GROQ_API_KEY never reaches the browser. Set it as a Vercel env var
// (and in .env.local for `vercel dev`); see .env.example.

export const config = { runtime: 'edge' }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

// One entry per supported task. Per-section editing tasks are tailored for
// teen / young-adult first-time résumé writers — truthful, concise, encouraging.
// Those users send a section as simple HTML (<p>, <ul>, <li>, <strong>, <em>)
// and models must return HTML with the same structure — no markdown, no code
// fences, no commentary — so the result writes straight back into the section.
//
// `import` is different: it turns a whole extracted résumé into structured JSON.
// It gets a larger input/output budget and JSON mode.
const TASKS = {
  improve: {
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'You improve one section of a first résumé for a teenager or young adult. The user sends the section as simple HTML. Rewrite for clarity and impact: strong action verbs, concise, honest — never invent experience, employers, numbers, or credentials. Preserve the HTML structure and the same tags (<p>, <ul>, <li>, <strong>, <em>). Return ONLY the improved HTML — no markdown, no code fences, no commentary.',
  },
  ideas: {
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'You help a teenager or young adult writing a first résumé. The user sends one résumé section as HTML for context. Suggest 3 short, realistic bullet points they could ADD, believable for someone with limited experience (school, part-time jobs, volunteering, activities) — never invent specific employers or achievements. Return ONLY an HTML fragment: a single <ul> with exactly three <li> items. No commentary, no code fences.',
  },
  grammar: {
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'Fix only spelling and grammar in the résumé section the user sends as HTML. Preserve the meaning, wording, tone, and every HTML tag and structure. Do not add or remove content. Return ONLY the corrected HTML — no markdown, no code fences, no commentary.',
  },
  polish: {
    maxInput: 2000,
    maxTokens: 500,
    temperature: 0.5,
    prompt:
      'You turn real job duties into résumé bullet points for a teenager or young adult writing a first résumé. The user sends one or more real tasks for a specific job (sourced from O*NET occupational data). Rewrite them as concise, first-person-implied résumé bullets with strong action verbs, in a voice believable for someone with limited experience. Keep them truthful to the duties given — do NOT invent employers, numbers, dates, or achievements. Return ONLY an HTML fragment: a single <ul> with one <li> per bullet. No commentary, no code fences.',
  },
  import: {
    maxInput: 15000,
    maxTokens: 2000,
    temperature: 0.2,
    json: true,
    prompt:
      'You convert the plain text of a résumé into structured JSON. Return ONLY a JSON object of the form {"sections":[{"title":string,"type":string,"content":string}]}. ' +
      'Rules: (1) The FIRST section must be exactly one section with type "contact"; its content is HTML whose FIRST <p> is the person\'s name, followed by <p> lines for email, phone, location, and links. ' +
      '(2) Use these type values when they fit: contact, summary, education, experience, skills, projects, certifications, activities, volunteer, awards, availability. Any block that does not fit uses type "custom". ' +
      '(3) Each content value is simple HTML using only <p>, <ul>, <li>, <strong>, <em>. Use <ul>/<li> for bullet lists (experience, skills), <p> for prose. ' +
      '(4) Preserve the real wording — do NOT invent employers, dates, numbers, or achievements that are not in the text. Fix obvious formatting only. ' +
      'No markdown, no code fences, no commentary — return the JSON object only.',
  },
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
  const config = TASKS[task]
  if (!config) return json({ error: 'Unknown task.' }, 400)
  if (typeof text !== 'string' || !text.trim()) {
    return json({ error: 'Please enter some text first.' }, 400)
  }
  if (text.length > config.maxInput) {
    return json({ error: `Text is too long (max ${config.maxInput} characters).` }, 413)
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
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        ...(config.json ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: config.prompt },
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
