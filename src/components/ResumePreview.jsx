import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PAPER_SIZES } from '../config/paperSizes'
import { getTemplate } from '../config/templates'
import ClassicLayout from './layouts/ClassicLayout'
import ModernLayout  from './layouts/ModernLayout'
import MinimalLayout from './layouts/MinimalLayout'
import './ResumePreview.css'

function LayoutSwitch({ sections, styles, template }) {
  switch (template.layout) {
    case 'sidebar': return <ModernLayout  sections={sections} styles={styles} template={template} />
    case 'minimal': return <MinimalLayout sections={sections} styles={styles} template={template} />
    default:        return <ClassicLayout sections={sections} styles={styles} template={template} />
  }
}

export default function ResumePreview({ resume, paperSizeKey = 'letter', zoom = 'fit', onPageCount }) {
  const scrollRef       = useRef(null)
  const contentMeasureRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [overflowPx, setOverflowPx]         = useState(0)

  useEffect(() => {
    if (!scrollRef.current) return
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    obs.observe(scrollRef.current)
    return () => obs.disconnect()
  }, [])

  if (!resume) return null
  const { sections, styles } = resume
  const template = getTemplate(styles.template)
  const resolvedTemplate = { ...template, accentColor: styles.accentColor ?? template.accentColor }

  const paper = PAPER_SIZES[paperSizeKey] ?? PAPER_SIZES.letter

  const fitScale = containerWidth > 0
    ? Math.max(0.25, Math.min(1.6, (containerWidth - 56) / paper.width))
    : 0.72
  const scale = zoom === 'fit' ? fitScale : Number(zoom)

  const scaledW = Math.round(paper.width  * scale)
  const scaledH = Math.round(paper.height * scale)

  // Sidebar layout is full-bleed; paper has no outer padding
  const isSidebar = resolvedTemplate.layout === 'sidebar'

  // Overflow detection — only meaningful for non-sidebar (single-column) layouts.
  // The paper has margin padding applied, so available height = paper.height - marginTop - marginBottom.
  const marginTop    = styles.marginTop    ?? 54
  const marginBottom = styles.marginBottom ?? 54
  useEffect(() => {
    const el = contentMeasureRef.current
    if (!el || isSidebar) { setOverflowPx(0); return }
    const availableH = paper.height - marginTop - marginBottom
    const check = () => setOverflowPx(Math.max(0, el.scrollHeight - availableH))
    check()
    const obs = new ResizeObserver(check)
    obs.observe(el)
    return () => obs.disconnect()
  }, [paper.height, isSidebar, marginTop, marginBottom])

  useEffect(() => {
    if (!onPageCount) return
    if (isSidebar) { onPageCount(1); return }
    const availableH = paper.height - marginTop - marginBottom
    const pages = Math.max(1, Math.ceil((availableH + overflowPx) / availableH))
    onPageCount(pages)
  }, [overflowPx, isSidebar, paper.height, marginTop, marginBottom])

  return (
    <div className="preview-scroll" ref={scrollRef}>
      <div className="preview-center-host">
        <div className="preview-sizer" style={{ width: scaledW, height: scaledH }}>
          <div
            className="preview-paper"
            style={{
              width:  paper.width,
              height: paper.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              fontFamily: styles.fontFamily,
              fontSize:   `${styles.fontSize}pt`,
              lineHeight: styles.lineSpacing,
              ...(isSidebar ? {} : {
                paddingTop:    `${styles.marginTop}px`,
                paddingRight:  `${styles.marginRight}px`,
                paddingBottom: `${styles.marginBottom}px`,
                paddingLeft:   `${styles.marginLeft}px`,
              }),
            }}
          >
            <div
              ref={contentMeasureRef}
              style={{ height: isSidebar ? '100%' : undefined }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={resolvedTemplate.id}
                  style={isSidebar ? { height: '100%' } : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <LayoutSwitch sections={sections} styles={styles} template={resolvedTemplate} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {overflowPx > 0 && (
          <div className="overflow-indicator" style={{ width: scaledW }}>
            <span className="overflow-indicator-icon">⚠</span>
            Content overflows ~{Math.round(overflowPx / paper.height * 100)}% past the page — try reducing font size or spacing
          </div>
        )}
      </div>
    </div>
  )
}
