import { useRef, useState, useEffect } from 'react'
import { PAPER_SIZES } from '../config/paperSizes'
import './ResumePreview.css'

export default function ResumePreview({ resume, paperSizeKey = 'letter', zoom = 'fit' }) {
  const scrollRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!scrollRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    obs.observe(scrollRef.current)
    return () => obs.disconnect()
  }, [])

  if (!resume) return null
  const { sections, styles } = resume

  const paper = PAPER_SIZES[paperSizeKey] ?? PAPER_SIZES.letter

  // 'fit' scales paper to fill the container with 56px of horizontal breathing room
  const fitScale = containerWidth > 0
    ? Math.max(0.25, Math.min(1.6, (containerWidth - 56) / paper.width))
    : 0.72
  const scale = zoom === 'fit' ? fitScale : Number(zoom)

  const scaledW = Math.round(paper.width * scale)
  const scaledH = Math.round(paper.height * scale)

  return (
    <div className="preview-scroll" ref={scrollRef}>
      <div className="preview-center-host">
        {/* sizer div occupies scaled space so the scroll container sizes correctly */}
        <div className="preview-sizer" style={{ width: scaledW, height: scaledH }}>
          <div
            className="preview-paper"
            style={{
              width: paper.width,
              height: paper.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              fontFamily: styles.fontFamily,
              fontSize: `${styles.fontSize}pt`,
              lineHeight: styles.lineSpacing,
              paddingTop:    `${styles.marginTop}px`,
              paddingRight:  `${styles.marginRight}px`,
              paddingBottom: `${styles.marginBottom}px`,
              paddingLeft:   `${styles.marginLeft}px`,
            }}
          >
            {sections.map(section => (
              <div
                key={section.id}
                className="preview-section"
                style={{ marginBottom: `${styles.sectionSpacing}px` }}
              >
                <div className="preview-section-heading">{section.title}</div>
                <div className="preview-section-rule" />
                <div
                  className="preview-section-body"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
