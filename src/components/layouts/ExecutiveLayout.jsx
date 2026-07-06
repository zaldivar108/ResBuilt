import './ExecutiveLayout.css'

export default function ExecutiveLayout({ sections, styles, template }) {
  const contact = sections.find(s => s.type === 'contact' && !s.hidden)
  const body    = sections.filter(s => s.type !== 'contact' && !s.hidden)
  const accent  = template.accentColor

  return (
    <div className="ex-layout">
      {/* ── Accent header banner ── */}
      {contact && (
        <div className="ex-header" style={{ background: accent }}>
          <div
            className="ex-header-body"
            dangerouslySetInnerHTML={{ __html: contact.content }}
          />
        </div>
      )}

      {/* ── Sections ── */}
      {body.map(section => (
        <div
          key={section.id}
          className="ex-section"
          style={{ marginBottom: `${styles.sectionSpacing}px` }}
        >
          <div className="ex-heading" style={{ color: accent }}>
            <span className="ex-heading-mark" style={{ background: accent }} />
            {section.title}
          </div>
          <div
            className="ex-body"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      ))}
    </div>
  )
}
