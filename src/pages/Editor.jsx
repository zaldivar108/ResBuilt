import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import { PAPER_SIZES, MARGIN_PRESETS, exportPDF } from '../config/paperSizes'
import EditorToolbar from '../components/EditorToolbar'
import ResumePreview from '../components/ResumePreview'
import './Editor.css'

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

const ZOOM_OPTIONS = [
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: 'Fit',  value: 'fit' },
]

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getResume, updateResume } = useResume()

  const [resume, setResume] = useState(null)
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [saved, setSaved] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [darkMode, setDarkMode] = useState(false)

  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    const r = getResume(id)
    if (!r) { navigate('/dashboard'); return }
    setResume(r)
    setActiveSectionId(r.sections[0]?.id ?? null)
  }, [id])

  useEffect(() => {
    if (!editorRef.current || !resume) return
    const section = resume.sections.find(s => s.id === activeSectionId)
    if (section) editorRef.current.innerHTML = section.content
  }, [activeSectionId])

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  function scheduleAutoSave(r) {
    setSaved(false)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateResume(r.id, r)
      setSaved(true)
    }, 900)
  }

  function patch(updater) {
    setResume(prev => {
      const next = updater(prev)
      scheduleAutoSave(next)
      return next
    })
  }

  function handleEditorInput() {
    if (!editorRef.current || !activeSectionId) return
    const content = editorRef.current.innerHTML
    patch(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, content } : s),
    }))
  }

  function saveNow() {
    clearTimeout(saveTimerRef.current)
    if (resume) { updateResume(resume.id, resume); setSaved(true) }
  }

  function switchSection(sectionId) {
    if (editorRef.current && activeSectionId) {
      const content = editorRef.current.innerHTML
      setResume(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, content } : s),
      }))
    }
    setActiveSectionId(sectionId)
  }

  function renameResume(title) {
    patch(prev => ({ ...prev, title }))
  }

  function renameSection(sectionId, title) {
    patch(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, title } : s),
    }))
  }

  function deleteSection(sectionId) {
    setResume(prev => {
      const sections = prev.sections.filter(s => s.id !== sectionId)
      const next = { ...prev, sections }
      scheduleAutoSave(next)
      if (activeSectionId === sectionId) setActiveSectionId(sections[0]?.id ?? null)
      return next
    })
  }

  function moveSection(sectionId, dir) {
    patch(prev => {
      const sections = [...prev.sections]
      const i = sections.findIndex(s => s.id === sectionId)
      const j = i + dir
      if (j < 0 || j >= sections.length) return prev
      ;[sections[i], sections[j]] = [sections[j], sections[i]]
      return { ...prev, sections }
    })
  }

  function addSection() {
    const title = newSectionTitle.trim() || 'New Section'
    const s = { id: genId(), title, type: 'custom', content: '<p>Add your content here.</p>' }
    setResume(prev => {
      const next = { ...prev, sections: [...prev.sections, s] }
      scheduleAutoSave(next)
      return next
    })
    setActiveSectionId(s.id)
    setAddingSection(false)
    setNewSectionTitle('')
  }

  function updateStyles(patch_) {
    patch(prev => ({ ...prev, styles: { ...prev.styles, ...patch_ } }))
  }

  function applyMarginPreset(key) {
    const p = MARGIN_PRESETS[key]
    updateStyles({ marginTop: p.top, marginRight: p.right, marginBottom: p.bottom, marginLeft: p.left })
  }

  const activeSection = resume?.sections.find(s => s.id === activeSectionId)
  const paperSizeKey = resume?.styles?.paperSize ?? 'letter'

  if (!resume) {
    return (
      <div className="editor-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className={`editor-layout${darkMode ? ' dark' : ''}`}>
      {/* Top nav */}
      <nav className="editor-nav">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <BackIcon /> Dashboard
        </button>
        <input
          className="resume-title-input"
          value={resume.title}
          onChange={e => renameResume(e.target.value)}
          placeholder="Resume title..."
        />
        <div className="editor-nav-right">
          <button
            className="dark-toggle-btn"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <span className={`save-badge ${saved ? 'saved' : 'pending'}`}>
            {saved ? '✓ Saved' : 'Saving…'}
          </span>
          <button className="save-btn" onClick={saveNow}>Save</button>
        </div>
      </nav>

      {/* Body: 4-column layout */}
      <div className="editor-body">

        {/* Col 1 — Sections sidebar (dark) */}
        <aside className="sidebar">
          <div className="sidebar-scroll">
            <div className="sidebar-section-label">Sections</div>

            <ul className="section-list">
              {resume.sections.map((section, idx) => (
                <li
                  key={section.id}
                  className={`section-item${section.id === activeSectionId ? ' active' : ''}`}
                >
                  <button
                    className="section-name-btn"
                    onClick={() => switchSection(section.id)}
                  >
                    {section.title}
                  </button>
                  <div className="section-controls">
                    <button
                      className="sc-btn"
                      onClick={() => moveSection(section.id, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >↑</button>
                    <button
                      className="sc-btn"
                      onClick={() => moveSection(section.id, 1)}
                      disabled={idx === resume.sections.length - 1}
                      title="Move down"
                    >↓</button>
                    <button
                      className="sc-btn del"
                      onClick={() => deleteSection(section.id)}
                      title="Delete"
                    >×</button>
                  </div>
                </li>
              ))}
            </ul>

            {addingSection ? (
              <div className="add-section-form">
                <input
                  autoFocus
                  className="add-section-input"
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  placeholder="Section name…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') addSection()
                    if (e.key === 'Escape') { setAddingSection(false); setNewSectionTitle('') }
                  }}
                />
                <div className="add-section-btns">
                  <button
                    className="asb cancel"
                    onClick={() => { setAddingSection(false); setNewSectionTitle('') }}
                  >Cancel</button>
                  <button className="asb confirm" onClick={addSection}>Add</button>
                </div>
              </div>
            ) : (
              <button className="add-section-btn" onClick={() => setAddingSection(true)}>
                + Add Section
              </button>
            )}
          </div>
        </aside>

        {/* Col 2 — Editor */}
        <div className="edit-area">
          {activeSection ? (
            <>
              <EditorToolbar editorRef={editorRef} />
              <div className="section-title-bar">
                <input
                  className="section-title-edit"
                  value={activeSection.title}
                  onChange={e => renameSection(activeSection.id, e.target.value)}
                  placeholder="Section title"
                />
              </div>
              <div
                ref={editorRef}
                className="content-editable"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
              />
            </>
          ) : (
            <div className="edit-empty">Select a section to start editing</div>
          )}
        </div>

        {/* Col 3 — Preview */}
        <div className="preview-panel">
          <div className="preview-toolbar">
            <select
              className="pt-size-select"
              value={paperSizeKey}
              onChange={e => updateStyles({ paperSize: e.target.value })}
              title="Paper size"
            >
              {Object.values(PAPER_SIZES).map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>

            <div className="pt-zoom-group">
              {ZOOM_OPTIONS.map(z => (
                <button
                  key={z.label}
                  className={`pt-zoom-btn${zoom === z.value ? ' active' : ''}`}
                  onClick={() => setZoom(z.value)}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <button
              className="pt-export-btn"
              onClick={() => exportPDF(resume)}
              title="Export as PDF"
            >
              ↓ Export PDF
            </button>
          </div>

          <ResumePreview
            resume={resume}
            paperSizeKey={paperSizeKey}
            zoom={zoom}
          />
        </div>

        {/* Col 4 — Styles sidebar (light) */}
        <aside className="styles-sidebar">
          <div className="ss-header">Styles</div>
          <div className="ss-body">

            <div className="ss-field">
              <span className="ss-label">Font Family</span>
              <select
                className="ss-select"
                value={resume.styles.fontFamily}
                onChange={e => updateStyles({ fontFamily: e.target.value })}
              >
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                <option value="Garamond, serif">Garamond</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Calibri', Candara, sans-serif">Calibri</option>
              </select>
            </div>

            <div className="ss-divider" />

            <div className="ss-field">
              <div className="ss-row">
                <span className="ss-label">Font Size</span>
                <span className="ss-val">{resume.styles.fontSize}pt</span>
              </div>
              <input
                className="ss-range"
                type="range" min="9" max="14" step="0.5"
                value={resume.styles.fontSize}
                onChange={e => updateStyles({ fontSize: Number(e.target.value) })}
              />
            </div>

            <div className="ss-field">
              <div className="ss-row">
                <span className="ss-label">Line Spacing</span>
                <span className="ss-val">{resume.styles.lineSpacing}</span>
              </div>
              <input
                className="ss-range"
                type="range" min="1" max="2.2" step="0.05"
                value={resume.styles.lineSpacing}
                onChange={e => updateStyles({ lineSpacing: Number(e.target.value) })}
              />
            </div>

            <div className="ss-field">
              <div className="ss-row">
                <span className="ss-label">Section Spacing</span>
                <span className="ss-val">{resume.styles.sectionSpacing}px</span>
              </div>
              <input
                className="ss-range"
                type="range" min="6" max="40"
                value={resume.styles.sectionSpacing}
                onChange={e => updateStyles({ sectionSpacing: Number(e.target.value) })}
              />
            </div>

            <div className="ss-divider" />

            <div className="ss-field">
              <span className="ss-label">Page Margins</span>
              <div className="ss-presets">
                {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className="ss-preset-btn"
                    onClick={() => applyMarginPreset(key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ss-field">
              <span className="ss-label">Margins (px)</span>
              <div className="ss-margins-grid">
                {[
                  ['marginTop',    'Top'],
                  ['marginRight',  'Right'],
                  ['marginBottom', 'Bottom'],
                  ['marginLeft',   'Left'],
                ].map(([key, label]) => (
                  <label key={key} className="ss-margin-cell">
                    <span>{label}</span>
                    <input
                      type="number" min="12" max="144"
                      value={resume.styles[key]}
                      onChange={e => updateStyles({ [key]: Number(e.target.value) })}
                    />
                  </label>
                ))}
              </div>
            </div>

          </div>
        </aside>

      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M8 2.5L3.5 6.5L8 10.5" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 9.5A6 6 0 015.5 2a6.5 6.5 0 107.5 7.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1 1M10.8 10.8l1 1M10.8 3.2l-1 1M4.2 10.8l-1 1"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
