/* global process */
// Vercel Edge Function — server-side proxy to OpenAI-compatible chat APIs.
// API keys never reach the browser. Set them as Vercel env vars (and in
// .env.local for `vercel dev`); see .env.example.
//
// Two providers, tried in order: OpenCode Zen (free models) as PRIMARY, Groq as
// automatic FALLBACK. A provider is only tried if its key is set, so with just
// GROQ_API_KEY configured this behaves exactly as the original Groq-only proxy.
// Fallback fires when the primary errors, returns nothing, or (for JSON tasks)
// returns unparseable JSON — so an unreliable free model degrades gracefully.

import { checkRateLimit } from './_rateLimit.js'

export const config = { runtime: 'edge' }

// Each task declares a `tier` ('small' | 'large'); each provider maps the tier
// to a concrete model. Small = fast/cheap editing; large = résumé structure
// extraction (import) which needs more capability + JSON mode.
const PROVIDERS = {
  // OpenCode Zen — OpenAI-compatible; free models (trial). Auth assumed to be a
  // standard Bearer token (OpenAI-compatible default; not documented — verify
  // live). Other free models available to swap in: 'mimo-v2.5-free',
  // 'north-mini-code-free'.
  opencode: {
    url: 'https://opencode.ai/zen/v1/chat/completions',
    envKey: 'OPENCODE_API_KEY',
    models: { small: 'deepseek-v4-flash-free', large: 'nemotron-3-ultra-free' },
  },
  // Groq — the proven fallback.
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    models: { small: 'llama-3.1-8b-instant', large: 'llama-3.3-70b-versatile' },
  },
}
const PROVIDER_ORDER = ['opencode', 'groq'] // primary → fallback

// OpenCode Zen's free models are all REASONING models: they spend tokens on
// hidden reasoning before emitting `content`, and that reasoning counts against
// max_tokens. Without headroom a tight per-task cap gets fully consumed by
// reasoning, content comes back empty/truncated, and every request silently
// falls through to Groq (so the free key would never actually serve). This
// ceiling absorbs the reasoning pass; it's a max, so it never raises Groq's
// cost (Groq stops at its natural end). Verified live: a realistic one-sentence
// `improve` burned ~1100 reasoning tokens before ~70 tokens of answer — hence
// the large margin. Trade-off: these free models are slow (multi-second) for
// short outputs; if reasoning still overruns, the Groq fallback catches it.
const REASONING_HEADROOM = 2000

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
    tier: 'small',
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'You improve one section of a first résumé for a teenager or young adult. The user sends the section as simple HTML. Rewrite for clarity and impact: strong action verbs, concise, honest — never invent experience, employers, numbers, or credentials. Preserve the HTML structure and the same tags (<p>, <ul>, <li>, <strong>, <em>). Return ONLY the improved HTML — no markdown, no code fences, no commentary.',
  },
  ideas: {
    tier: 'small',
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'You help a teenager or young adult writing a first résumé. The user sends one résumé section as HTML for context. Suggest 3 short, realistic bullet points they could ADD, believable for someone with limited experience (school, part-time jobs, volunteering, activities) — never invent specific employers or achievements. Return ONLY an HTML fragment: a single <ul> with exactly three <li> items. No commentary, no code fences.',
  },
  grammar: {
    tier: 'small',
    maxInput: 2000,
    maxTokens: 600,
    temperature: 0.5,
    prompt:
      'Fix only spelling and grammar in the résumé section the user sends as HTML. Preserve the meaning, wording, tone, and every HTML tag and structure. Do not add or remove content. Return ONLY the corrected HTML — no markdown, no code fences, no commentary.',
  },
  format: {
    tier: 'small',
    maxInput: 6000,
    maxTokens: 1200,
    temperature: 0.2,
    prompt:
      'You reformat ONE section of a first résumé for a teenager or young adult into the clean, conventional layout for that kind of section. The user sends the section as HTML. Reformat the SAME information into standard résumé structure — do NOT reword beyond light cleanup, do NOT add or drop any facts, and never invent experience, employers, numbers, dates, or credentials. Use only <p>, <ul>, <li>, <strong>, <em>. Return ONLY the formatted HTML — no markdown, no code fences, no commentary.',
  },
  polish: {
    tier: 'small',
    maxInput: 2000,
    maxTokens: 500,
    temperature: 0.5,
    prompt:
      'You turn real job duties into résumé bullet points for a teenager or young adult writing a first résumé. The user sends one or more real tasks for a specific job (sourced from O*NET occupational data). Rewrite them as concise, first-person-implied résumé bullets with strong action verbs, in a voice believable for someone with limited experience. Keep them truthful to the duties given — do NOT invent employers, numbers, dates, or achievements. Return ONLY an HTML fragment: a single <ul> with one <li> per bullet. No commentary, no code fences.',
  },
  tailor: {
    tier: 'small',
    maxInput: 6000,
    maxTokens: 700,
    temperature: 0.3,
    json: true,
    prompt:
      'You compare a résumé section to a job posting for a teenager or young adult. The input has two labeled parts: JOB POSTING and RÉSUMÉ SECTION. ' +
      'Return ONLY a JSON object {"matched":[string],"missing":[string],"suggestions":[string]}. ' +
      'matched = important skills/keywords from the posting that ALREADY appear in the section. ' +
      'missing = important skills/keywords from the posting that are NOT in the section. ' +
      'suggestions = up to 3 short résumé bullet ideas relevant to the posting that the person could add IF true — phrase them as suggestions, never as facts, and never invent specific employers, numbers, or achievements. ' +
      'Keep every item short. No markdown, no code fences, no commentary — the JSON object only.',
  },
  retarget: {
    tier: 'small',
    maxInput: 6000,
    maxTokens: 700,
    temperature: 0.4,
    prompt:
      'You rewrite ONE résumé section to better match a job posting, for a teenager or young adult. The input has two labeled parts: JOB POSTING and RÉSUMÉ SECTION (HTML). ' +
      'Reorder and rephrase ONLY information already present in the section to emphasize what is relevant to the posting and mirror its wording where honest. ' +
      'Do NOT add skills, employers, numbers, dates, or achievements that are not already in the section. Preserve the HTML structure and tags (<p>, <ul>, <li>, <strong>, <em>). ' +
      'Return ONLY the rewritten HTML — no markdown, no code fences, no commentary.',
  },
  import: {
    tier: 'large',
    maxInput: 8000,
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

// The "format" task adapts to the section it's run on: each résumé section type
// has its own conventional layout. The matching hint is appended to the base
// format prompt server-side using the `sectionType` the client sends.
const FORMAT_HINTS = {
  contact:
    'This is a CONTACT section. Put the person\'s full name alone in the FIRST <p> wrapped in <strong>. Then one <p> per line, in this order when present: email, phone, location, links. Normalize the phone number to a standard style (e.g. (555) 123-4567 for a US 10-digit number) and keep the email and URLs exactly as given. Drop nothing; do not invent missing details.',
  education:
    'This is an EDUCATION section. Format each school as a line "School Name — City, State — Year" with the school name in <strong>, and put the degree/diploma, GPA, or honors on the next line. Use one <p> per entry, or a <ul> with one <li> per school if there are several. Do not invent schools, locations, dates, or grades.',
  experience:
    'This is a WORK EXPERIENCE section. For each job, write a heading line "Job Title, Employer — Month Year–Month Year" with the job title in <strong>, followed by a <ul> of concise, action-verb duty bullets (one duty per <li>). Split any run-on paragraph of duties into separate bullets. Do not invent employers, titles, dates, or achievements.',
  skills:
    'This is a SKILLS section. Format as a single <ul> with one concise skill per <li>, grouped logically (related skills adjacent). Do not invent skills.',
  summary:
    'This is a SUMMARY section. Format as one tight <p> of 2–3 sentences — no bullets. Do not invent experience.',
  projects:
    'This is a PROJECTS section. For each project, a heading line with the project name in <strong>, followed by a short <ul> of what was built or done. Do not invent projects or outcomes.',
  certifications:
    'This is a CERTIFICATIONS section. One <li> per certification as "Certification Name — Issuer — Year" (name in <strong>). Do not invent certifications, issuers, or dates.',
  default:
    'Format this section with clean résumé conventions: use a <ul> with one concise <li> per item when it is a list of duties or facts, or tidy <p> lines otherwise. Split run-on paragraphs into separate points. Do not invent content.',
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  // Per-IP throttle on the shared Groq key (best-effort; see api/_rateLimit.js).
  const rl = checkRateLimit(req, { limit: 30 })
  if (!rl.ok) {
    return json({ error: 'Too many requests — please slow down and try again shortly.' }, 429, {
      'Retry-After': String(rl.retryAfter),
    })
  }

  // Providers to try, in order, whose key is configured. Empty → not set up.
  const providers = PROVIDER_ORDER
    .map(name => ({ name, ...PROVIDERS[name], key: process.env[PROVIDERS[name].envKey] }))
    .filter(p => p.key)
  if (!providers.length) return json({ error: 'AI is not configured on the server.' }, 503)

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const { task, text } = body ?? {}
  // Own-property check: guards against inherited members like "__proto__" /
  // "constructor" resolving to a truthy object and slipping past the allow-list
  // (which would then bypass the maxInput cap on an undefined config).
  const config = typeof task === 'string' && Object.hasOwn(TASKS, task) ? TASKS[task] : null
  if (!config) return json({ error: 'Unknown task.' }, 400)
  if (typeof text !== 'string' || !text.trim()) {
    return json({ error: 'Please enter some text first.' }, 400)
  }
  if (text.length > config.maxInput) {
    return json({ error: `Text is too long (max ${config.maxInput} characters).` }, 413)
  }

  // Streaming is opt-in and only for plain-HTML tasks — JSON tasks (import,
  // tailor) must arrive whole to parse. Falls back to the buffered path otherwise.
  const wantStream = body.stream === true && !config.json

  // "format" adapts to the active section: append the per-type layout hint.
  let systemPrompt = config.prompt
  if (task === 'format') {
    const hint = typeof body.sectionType === 'string' && Object.hasOwn(FORMAT_HINTS, body.sectionType)
      ? FORMAT_HINTS[body.sectionType]
      : FORMAT_HINTS.default
    systemPrompt += ' ' + hint
  }

  const requestBody = model => JSON.stringify({
    model,
    temperature: config.temperature,
    max_tokens: config.maxTokens + REASONING_HEADROOM,
    ...(config.json ? { response_format: { type: 'json_object' } } : {}),
    ...(wantStream ? { stream: true } : {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text.trim() },
    ],
  })
  const headersFor = p => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` })

  // Try each provider in turn; the first success wins. A non-2xx, network error,
  // empty completion, or (for JSON tasks) unparseable body drops to the next.
  let lastStatus = 502
  for (const p of providers) {
    let res
    try {
      res = await fetch(p.url, { method: 'POST', headers: headersFor(p), body: requestBody(p.models[config.tier]) })
    } catch {
      lastStatus = 502
      continue // network error — try the fallback
    }

    if (!res.ok) {
      lastStatus = res.status === 429 ? 429 : 502
      continue // upstream rejected — try the fallback (never leak its body)
    }

    if (wantStream) {
      // Pass the upstream SSE stream straight through to the browser. Can't fall
      // back once bytes flow, so only a pre-stream failure (above) is recoverable.
      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    let result
    try {
      const data = await res.json()
      result = data?.choices?.[0]?.message?.content?.trim() ?? ''
    } catch {
      lastStatus = 502
      continue // malformed response envelope — try the fallback
    }
    if (!result) { lastStatus = 502; continue }
    // JSON tasks must return parseable JSON; a free model that ignores JSON mode
    // shouldn't win over a fallback that honors it.
    if (config.json) {
      try { JSON.parse(result) } catch { lastStatus = 502; continue }
    }
    return json({ result })
  }

  const error = lastStatus === 429
    ? 'The AI service is busy right now — try again in a moment.'
    : 'The AI service returned an error. Try again shortly.'
  return json({ error }, lastStatus)
}
