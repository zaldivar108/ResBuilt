import './TimelineLayout.css'

export default function TimelineLayout({ sections, styles, template }) {
  const accent  = template.accentColor
  const contact = sections.find(s => s.type === 'contact' && !s.hidden)
  const body    = sections.filter(s => s.type !== 'contact' && !s.hidden)

  return (
    <div className="tl-layout">
      {/* ── Left-aligned header ── */}
      {contact && (
        <div className="tl-header">
          <div
            className="tl-header-body"
            dangerouslySetInnerHTML={{ __html: contact.content }}
          />
        </div>
      )}

      {/* ── Timeline track ── */}
      <div className="tl-track" style={{ borderLeftColor: `${accent}33` }}>
        {body.map(section => (
          <div
            key={section.id}
            className="tl-section"
            style={{ marginBottom: `${styles.sectionSpacing}px` }}
          >
            <span
              className="tl-dot"
              style={{ background: accent, boxShadow: `0 0 0 3px ${accent}22` }}
            />
            <div className="tl-heading" style={{ color: accent }}>
              {section.title}
            </div>
            <div
              className="tl-body"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
