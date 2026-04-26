import './ClassicLayout.css'

export default function ClassicLayout({ sections, styles, template }) {
  const contact = sections.find(s => s.type === 'contact')
  const body    = sections.filter(s => s.type !== 'contact')
  const accent  = template.accentColor

  return (
    <div className="cl-layout">
      {/* ── Centered header ── */}
      {contact && (
        <div className="cl-header" style={{ borderBottomColor: accent }}>
          <div
            className="cl-header-body"
            dangerouslySetInnerHTML={{ __html: contact.content }}
          />
        </div>
      )}

      {/* ── Sections ── */}
      {body.map(section => (
        <div
          key={section.id}
          className="cl-section"
          style={{ marginBottom: `${styles.sectionSpacing}px` }}
        >
          <div
            className="cl-heading"
            style={{ color: accent, borderBottomColor: accent }}
          >
            {section.title}
          </div>
          <div
            className="cl-body"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      ))}
    </div>
  )
}
