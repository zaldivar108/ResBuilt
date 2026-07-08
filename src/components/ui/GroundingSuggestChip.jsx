import { useState } from 'react'
import { getOccupation, getOccupationRemote } from '../../lib/onet'

// One-click "ground ideas in real duties" nudge (ADR 0005) — never applied
// automatically. Accepting resolves the FULL occupation record (live proxy
// first, bundled seed fallback — same contract as OnetSuggest's manual pick)
// since "Suggest ideas" grounding needs the task list, not just {code,title}.
export default function GroundingSuggestChip({ suggestion, onAccept, onDismiss }) {
  const [busy, setBusy] = useState(false)

  async function accept() {
    if (busy) return
    setBusy(true)
    let occ = null
    try {
      occ = await getOccupationRemote(suggestion.code, suggestion.title)
    } catch {
      // Proxy unavailable/offline — fall back to the bundled seed below.
    }
    if (!occ || !occ.tasks?.length) occ = getOccupation(suggestion.code)
    setBusy(false)
    if (occ) onAccept(occ)
  }

  return (
    <div className="ai-ground-hint ai-ground-suggest">
      <span>Ground ideas in real <strong>{suggestion.title}</strong> duties?</span>
      <div className="ai-ground-suggest-actions">
        <button type="button" className="ai-ground-use-btn" disabled={busy} onClick={accept}>
          {busy ? 'Loading…' : 'Use it'}
        </button>
        <button type="button" className="ai-ground-dismiss-btn" onClick={onDismiss} aria-label="Dismiss suggestion">
          Dismiss
        </button>
      </div>
    </div>
  )
}
