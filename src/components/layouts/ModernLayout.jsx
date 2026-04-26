import './ModernLayout.css'

export default function ModernLayout({ sections, styles, template }) {
  const {
    sidebarSectionTypes = [],
    sidebarWidth = 205,
    accentColor,
    sidebarBg,
    sidebarColor,
  } = template

  const sidebarSections = sections.filter(s => sidebarSectionTypes.includes(s.type))
  const mainSections    = sections.filter(s => !sidebarSectionTypes.includes(s.type))

  // Sidebar heading uses a lighter tint of the accent for readability on dark bg
  const sbHeadingColor = '#818CF8'

  return (
    <div className="ml-layout">
      {/* ── Left Sidebar ── */}
      <div
        className="ml-sidebar"
        style={{ width: sidebarWidth, background: sidebarBg, color: sidebarColor }}
      >
        {sidebarSections.map(section => (
          <div
            key={section.id}
            className="ml-sb-section"
            style={{ marginBottom: `${styles.sectionSpacing + 4}px` }}
          >
            {section.type === 'contact' ? (
              /* Contact: name large-white, details muted */
              <div
                className="ml-sb-contact"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            ) : (
              <>
                <div
                  className="ml-sb-heading"
                  style={{ color: sbHeadingColor, borderBottomColor: `${sbHeadingColor}44` }}
                >
                  {section.title}
                </div>
                <div
                  className="ml-sb-body"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Right Main ── */}
      <div className="ml-main" style={{ padding: '26px 22px 26px 22px' }}>
        {mainSections.map(section => (
          <div
            key={section.id}
            className="ml-main-section"
            style={{ marginBottom: `${styles.sectionSpacing}px` }}
          >
            <div
              className="ml-main-heading"
              style={{ color: accentColor, borderBottomColor: accentColor }}
            >
              {section.title}
            </div>
            <div
              className="ml-main-body"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
