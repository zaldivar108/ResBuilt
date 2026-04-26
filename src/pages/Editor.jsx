import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useResume } from '../context/ResumeContext'
import { PAPER_SIZES, MARGIN_PRESETS, exportPDF } from '../config/paperSizes'
import EditorToolbar from '../components/EditorToolbar'
import ResumePreview from '../components/ResumePreview'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import Switch from '../components/ui/switch'
import { TEMPLATES, getTemplate } from '../config/templates'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './Editor.css'

const FONT_FAMILY_OPTIONS = [
  { value: 'Georgia, serif',                          label: 'Georgia' },
  { value: "'Times New Roman', Times, serif",         label: 'Times New Roman' },
  { value: 'Arial, sans-serif',                       label: 'Arial' },
  { value: "'Helvetica Neue', Helvetica, sans-serif", label: 'Helvetica' },
  { value: 'Garamond, serif',                         label: 'Garamond' },
  { value: 'Verdana, sans-serif',                     label: 'Verdana' },
  { value: "'Calibri', Candara, sans-serif",          label: 'Calibri' },
]

const PAPER_SIZE_OPTIONS = Object.values(PAPER_SIZES).map(p => ({ value: p.key, label: p.label }))

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

const ZOOM_OPTIONS = [
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: 'Fit',  value: 'fit' },
]

const ACCENT_PRESETS = [
  '#1E293B', '#4F46E5', '#0891B2', '#16A34A',
  '#DC2626', '#7C3AED', '#EA580C', '#94A3B8',
]

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getResume, updateResume, darkMode, setDarkMode } = useResume()

  const [resume, setResume] = useState(null)
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [saved, setSaved] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [activeDragId, setActiveDragId] = useState(null)
  const [pageCount, setPageCount] = useState(1)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [stylesSidebarCollapsed, setStylesSidebarCollapsed] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [lastDeleted, setLastDeleted] = useState(null) // { section, index }

  const editorRef    = useRef(null)
  const saveTimerRef = useRef(null)
  const undoTimerRef = useRef(null)

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

  useEffect(() => () => {
    clearTimeout(saveTimerRef.current)
    clearTimeout(undoTimerRef.current)
  }, [])

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
    setConfirmDeleteId(null)
    setResume(prev => {
      const index = prev.sections.findIndex(s => s.id === sectionId)
      const section = prev.sections[index]
      const sections = prev.sections.filter(s => s.id !== sectionId)
      const next = { ...prev, sections }
      scheduleAutoSave(next)
      if (activeSectionId === sectionId) setActiveSectionId(sections[0]?.id ?? null)

      clearTimeout(undoTimerRef.current)
      setLastDeleted({ section, index })
      undoTimerRef.current = setTimeout(() => setLastDeleted(null), 5000)

      return next
    })
  }

  function toggleSectionVisibility(sectionId) {
    patch(prev => ({
      ...prev,
      sections: prev.sections.map(s =>
        s.id === sectionId ? { ...s, hidden: !s.hidden } : s
      ),
    }))
  }

  function undoDelete() {
    if (!lastDeleted) return
    clearTimeout(undoTimerRef.current)
    const { section, index } = lastDeleted
    setLastDeleted(null)
    patch(prev => {
      const sections = [...prev.sections]
      sections.splice(index, 0, section)
      return { ...prev, sections }
    })
    setActiveSectionId(section.id)
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

  function applyTemplate(templateId) {
    const tpl = TEMPLATES[templateId]
    if (!tpl) return
    patch(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        ...tpl.defaultStyles,
        template: templateId,
        accentColor: tpl.accentColor,
      },
    }))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event) {
    setActiveDragId(event.active.id)
  }

  function handleDragEnd(event) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    patch(prev => {
      const oldIndex = prev.sections.findIndex(s => s.id === active.id)
      const newIndex = prev.sections.findIndex(s => s.id === over.id)
      return { ...prev, sections: arrayMove(prev.sections, oldIndex, newIndex) }
    })
  }

  function applyMarginPreset(key) {
    const p = MARGIN_PRESETS[key]
    updateStyles({ marginTop: p.top, marginRight: p.right, marginBottom: p.bottom, marginLeft: p.left })
  }

  const activeSection  = resume?.sections.find(s => s.id === activeSectionId)
  const paperSizeKey   = resume?.styles?.paperSize ?? 'letter'
  const activeTemplate = getTemplate(resume?.styles?.template)

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
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <span className={`save-badge ${saved ? 'saved' : 'pending'}`}>
            {saved ? '✓ Saved' : 'Saving…'}
          </span>
          <button className="save-btn" onClick={saveNow}>Save</button>
        </div>
      </nav>

      {/* Body: 4-column layout */}
      <div className="editor-body">

        {/* Col 1 — Sections sidebar (dark) */}
        <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon collapsed={sidebarCollapsed} />
          </button>
          <div className="sidebar-scroll">
            <div className="sidebar-section-label">Sections</div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={resume.sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="section-list">
                  {resume.sections.map(section => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      isActive={section.id === activeSectionId}
                      onSelect={() => switchSection(section.id)}
                      onDelete={() => deleteSection(section.id)}
                      onToggleVisibility={() => toggleSectionVisibility(section.id)}
                      isDragging={activeDragId === section.id}
                      isConfirming={confirmDeleteId === section.id}
                      onDeleteRequest={() => setConfirmDeleteId(section.id)}
                      onDeleteCancel={() => setConfirmDeleteId(null)}
                    />
                  ))}
                </ul>
              </SortableContext>
              <DragOverlay>
                {activeDragId ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li className="section-item section-item-overlay">
                      <span className="drag-handle"><GripIcon /></span>
                      <span className="section-name-btn">
                        {resume.sections.find(s => s.id === activeDragId)?.title}
                      </span>
                    </li>
                  </ul>
                ) : null}
              </DragOverlay>
            </DndContext>

            {lastDeleted && (
              <div className="undo-toast">
                <span className="undo-toast-label">"{lastDeleted.section.title}" deleted</span>
                <button className="undo-btn" onClick={undoDelete}>Undo</button>
              </div>
            )}

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
            <SelectDropdown
              value={paperSizeKey}
              onValueChange={val => updateStyles({ paperSize: val })}
              options={PAPER_SIZE_OPTIONS}
              triggerClassName="pt-size-select"
            />

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

            <span className={`pt-page-count${pageCount > 1 ? ' overflow' : ''}`}>
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>

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
            onPageCount={setPageCount}
          />
        </div>

        {/* Col 4 — Styles sidebar (light) */}
        <aside className={`styles-sidebar${stylesSidebarCollapsed ? ' collapsed' : ''}`}>
          <button
            className="ss-collapse-btn"
            onClick={() => setStylesSidebarCollapsed(v => !v)}
            title={stylesSidebarCollapsed ? 'Expand styles' : 'Collapse styles'}
          >
            <CollapseIcon collapsed={!stylesSidebarCollapsed} />
          </button>
          <div className="ss-header">Styles</div>
          <div className="ss-body">

            {/* ── Template picker ── */}
            <div className="ss-field">
              <span className="ss-label">Template</span>
              <div className="template-cards">
                {Object.values(TEMPLATES).map(tpl => (
                  <button
                    key={tpl.id}
                    className={`template-card${activeTemplate.id === tpl.id ? ' active' : ''}`}
                    onClick={() => applyTemplate(tpl.id)}
                    title={tpl.fullName}
                  >
                    <TemplateThumbnail id={tpl.id} />
                    <span className="tpl-name">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ss-divider" />

            {/* ── Accent Color ── */}
            <div className="ss-field">
              <span className="ss-label">Accent Color</span>
              <div className="accent-swatches">
                {ACCENT_PRESETS.map(color => (
                  <button
                    key={color}
                    className={`accent-swatch${(resume.styles.accentColor ?? activeTemplate.accentColor) === color ? ' active' : ''}`}
                    style={{ background: color }}
                    onClick={() => updateStyles({ accentColor: color })}
                    title={color}
                  />
                ))}
                <label className="accent-custom" title="Custom color">
                  <input
                    type="color"
                    value={resume.styles.accentColor ?? activeTemplate.accentColor}
                    onChange={e => updateStyles({ accentColor: e.target.value })}
                  />
                  <span
                    className="accent-custom-dot"
                    style={{ background: resume.styles.accentColor ?? activeTemplate.accentColor }}
                  />
                </label>
              </div>
            </div>

            <div className="ss-divider" />

            <div className="ss-field">
              <span className="ss-label">Font Family</span>
              <SelectDropdown
                value={resume.styles.fontFamily}
                onValueChange={val => updateStyles({ fontFamily: val })}
                options={FONT_FAMILY_OPTIONS}
                triggerClassName="ss-select"
              />
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

            {activeTemplate.layout !== 'sidebar' && (
              <>
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
              </>
            )}

          </div>
        </aside>

      </div>
    </div>
  )
}

function CollapseIcon({ collapsed }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {collapsed
        ? <path d="M4 2.5L8 6L4 9.5" />
        : <path d="M8 2.5L4 6L8 9.5" />
      }
    </svg>
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

/* ── Sortable section item ── */
function SortableSectionItem({ section, isActive, onSelect, onDelete, onToggleVisibility, isDragging, isConfirming, onDeleteRequest, onDeleteCancel }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`section-item${isActive ? ' active' : ''}${section.hidden ? ' hidden' : ''}${isConfirming ? ' confirming' : ''}`}
      {...attributes}
    >
      <button className="drag-handle" {...listeners} tabIndex={-1}>
        <GripIcon />
      </button>
      <button className="section-name-btn" onClick={onSelect}>
        {section.title}
      </button>
      {isConfirming ? (
        <div className="section-confirm">
          <span className="section-confirm-label">Delete?</span>
          <button className="sc-btn confirm-yes" onClick={onDelete} title="Confirm delete">✓</button>
          <button className="sc-btn confirm-no"  onClick={onDeleteCancel} title="Cancel">✕</button>
        </div>
      ) : (
        <div className="section-controls">
          <button
            className="sc-btn vis"
            onClick={onToggleVisibility}
            title={section.hidden ? 'Show section' : 'Hide section'}
          >
            {section.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button className="sc-btn del" onClick={onDeleteRequest} title="Delete">×</button>
        </div>
      )}
    </li>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3"   cy="2.5"  r="1.2" />
      <circle cx="7"   cy="2.5"  r="1.2" />
      <circle cx="3"   cy="7"    r="1.2" />
      <circle cx="7"   cy="7"    r="1.2" />
      <circle cx="3"   cy="11.5" r="1.2" />
      <circle cx="7"   cy="11.5" r="1.2" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
      <path d="M1 6.5C1 6.5 3 2.5 6.5 2.5C10 2.5 12 6.5 12 6.5C12 6.5 10 10.5 6.5 10.5C3 10.5 1 6.5 1 6.5Z"/>
      <circle cx="6.5" cy="6.5" r="1.5"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
      <path d="M1 6.5C1 6.5 3 2.5 6.5 2.5C10 2.5 12 6.5 12 6.5C12 6.5 10 10.5 6.5 10.5C3 10.5 1 6.5 1 6.5Z"/>
      <circle cx="6.5" cy="6.5" r="1.5"/>
      <line x1="2" y1="2" x2="11" y2="11"/>
    </svg>
  )
}

/* ── Mini CSS-drawn thumbnails for the template picker ── */
function TemplateThumbnail({ id }) {
  if (id === 'modern') {
    return (
      <div className="tpl-thumb" style={{ flexDirection: 'row' }}>
        {/* dark sidebar column */}
        <div style={{ width: 15, background: '#1E293B', padding: '5px 3px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ width: '100%', height: 2.5, background: 'rgba(255,255,255,0.85)', borderRadius: 1 }} />
          <div style={{ width: '80%',  height: 1,   background: '#475569', borderRadius: 1 }} />
          <div style={{ width: '70%',  height: 1,   background: '#475569', borderRadius: 1, marginBottom: 3 }} />
          {['#818CF8','#818CF8'].map((c, i) => <div key={i} style={{ width: '90%', height: 1, background: c, borderRadius: 1 }} />)}
          {[90,70,55].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 1, background: '#334155', borderRadius: 1 }} />)}
        </div>
        {/* main column */}
        <div style={{ flex: 1, padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1.5,0.5].map((h, i) => <div key={i} style={{ width: i===0 ? '80%' : '100%', height: h, background: '#4F46E5', borderRadius: 1 }} />)}
          {[90,70,55].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 1, background: '#D1D5DB', borderRadius: 1 }} />)}
          <div style={{ height: 3 }} />
          {[1.5,0.5].map((h, i) => <div key={i} style={{ width: i===0 ? '75%' : '100%', height: h, background: '#4F46E5', borderRadius: 1 }} />)}
          {[85,65,50].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 1, background: '#D1D5DB', borderRadius: 1 }} />)}
        </div>
      </div>
    )
  }

  if (id === 'minimal') {
    return (
      <div className="tpl-thumb" style={{ padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ borderBottom: '0.5px solid #E2E8F0', paddingBottom: 3, marginBottom: 4 }}>
          <div style={{ width: '60%', height: 2, background: '#0F172A', borderRadius: 1, marginBottom: 2 }} />
          <div style={{ width: '42%', height: 1, background: '#94A3B8', borderRadius: 1 }} />
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ marginBottom: 5 }}>
            <div style={{ width: '38%', height: 1, background: '#94A3B8', borderRadius: 1, marginBottom: 1 }} />
            <div style={{ width: 6, height: 1.5, background: '#94A3B8', borderRadius: 1, marginBottom: 2 }} />
            <div style={{ width: '80%', height: 1, background: '#E2E8F0', borderRadius: 1, marginBottom: 1 }} />
            <div style={{ width: '60%', height: 1, background: '#E2E8F0', borderRadius: 1 }} />
          </div>
        ))}
      </div>
    )
  }

  // Classic (default)
  return (
    <div className="tpl-thumb" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ textAlign: 'center', padding: '5px 4px 3px', borderBottom: '1px solid #E2E8F0', marginBottom: 3 }}>
        <div style={{ width: '65%', height: 2.5, background: '#1E293B', borderRadius: 1, margin: '0 auto 2px' }} />
        <div style={{ width: '48%', height: 1,   background: '#94A3B8', borderRadius: 1, margin: '0 auto' }} />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ padding: '0 4px', marginBottom: 4 }}>
          <div style={{ width: '42%', height: 1.5, background: '#1E293B', borderRadius: 1, marginBottom: 1 }} />
          <div style={{ width: '100%', height: 0.5, background: '#E2E8F0', marginBottom: 2 }} />
          <div style={{ width: '88%', height: 1, background: '#D1D5DB', borderRadius: 1, marginBottom: 1 }} />
          <div style={{ width: '70%', height: 1, background: '#D1D5DB', borderRadius: 1 }} />
        </div>
      ))}
    </div>
  )
}

