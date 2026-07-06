import './CompactLayout.css'

// Sections that carry the main narrative go in the wide left column;
// everything else (skills, activities, awards, etc.) goes in the side column.
const MAIN_TYPES = ['summary', 'experience', 'education', 'projects']

export default function CompactLayout({ sections, styles, template }) {
  const accent  = template.accentColor
  const contact = sections.find(s => s.type === 'contact' && !s.hidden)
  const visible = sections.filter(s => s.type !== 'contact' && !s.hidden)
  const mainSections = visible.filter(s => MAIN_TYPES.includes(s.type))
  const sideSections = visible.filter(s => !MAIN_TYPES.includes(s.type))

  const renderSection = section => (
    <div
      key={section.id}
      className="cp-section"
      style={{ marginBottom: `${styles.sectionSpacing}px` }}
    >
      <div className="cp-heading" style={{ color: accent, borderBottomColor: accent }}>
        {section.title}
      </div>
      <div className="cp-body" dangerouslySetInnerHTML={{ __html: section.content }} />
    </div>
  )

  return (
    <div className="cp-layout">
      {/* ── Full-width header ── */}
      {contact && (
        <div className="cp-header" style={{ borderBottomColor: accent }}>
          <div
            className="cp-header-body"
            dangerouslySetInnerHTML={{ __html: contact.content }}
          />
        </div>
      )}

      {/* ── Two columns ── */}
      <div className="cp-columns">
        <div className="cp-col cp-col-main">
          {mainSections.map(renderSection)}
        </div>
        <div className="cp-col cp-col-side">
          {sideSections.map(renderSection)}
        </div>
      </div>
    </div>
  )
}
