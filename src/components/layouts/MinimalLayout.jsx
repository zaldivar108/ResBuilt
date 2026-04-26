import './MinimalLayout.css'

export default function MinimalLayout({ sections, styles, template }) {
  const contact = sections.find(s => s.type === 'contact')
  const body    = sections.filter(s => s.type !== 'contact')
  const accent  = template.accentColor

  return (
    <div className="mnl-layout">
      {/* ── Left-aligned header ── */}
      {contact && (
        <div className="mnl-header">
          <div
            className="mnl-header-body"
            dangerouslySetInnerHTML={{ __html: contact.content }}
          />
        </div>
      )}

      {/* ── Sections ── */}
      {body.map(section => (
        <div
          key={section.id}
          className="mnl-section"
          style={{ marginBottom: `${styles.sectionSpacing}px` }}
        >
          <div className="mnl-heading" style={{ color: accent }}>
            {section.title}
          </div>
          <div className="mnl-accent-line" style={{ background: accent }} />
          <div
            className="mnl-body"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </div>
      ))}
    </div>
  )
}
