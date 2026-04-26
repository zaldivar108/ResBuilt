const PPI = 96
const mm2px = mm => Math.round(mm * PPI / 25.4)

export const PAPER_SIZES = {
  letter: {
    key: 'letter',
    label: 'US Letter',
    width: Math.round(8.5 * PPI),   // 816px
    height: Math.round(11 * PPI),   // 1056px
    cssPageSize: '8.5in 11in',
  },
  a4: {
    key: 'a4',
    label: 'A4',
    width: mm2px(210),   // 794px
    height: mm2px(297),  // 1123px
    cssPageSize: '210mm 297mm',
  },
  legal: {
    key: 'legal',
    label: 'Legal',
    width: Math.round(8.5 * PPI),   // 816px
    height: Math.round(14 * PPI),   // 1344px
    cssPageSize: '8.5in 14in',
  },
  a5: {
    key: 'a5',
    label: 'A5',
    width: mm2px(148),   // 559px
    height: mm2px(210),  // 794px
    cssPageSize: '148mm 210mm',
  },
}

export const MARGIN_PRESETS = {
  narrow: { label: 'Narrow', top: 36,  right: 36,  bottom: 36,  left: 36  },
  normal: { label: 'Normal', top: 72,  right: 72,  bottom: 72,  left: 72  },
  wide:   { label: 'Wide',   top: 108, right: 108, bottom: 108, left: 108 },
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function collectCSS() {
  const parts = []
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) parts.push(rule.cssText)
    } catch { /* skip cross-origin */ }
  }
  return parts.join('\n')
}

export function exportPDF(resume) {
  const paper = PAPER_SIZES[resume.styles?.paperSize] ?? PAPER_SIZES.letter
  const { title } = resume

  const paperEl = document.querySelector('.preview-paper')
  if (!paperEl) {
    alert('Preview not found — make sure the editor is visible, then try again.')
    return
  }

  const clone = paperEl.cloneNode(true)

  // Detect if template uses full-bleed sidebar layout
  const isSidebar = clone.querySelector('.ml-layout') !== null

  // Reset transform / position so it prints at actual size
  clone.style.position   = 'static'
  clone.style.transform  = 'none'
  clone.style.boxShadow  = 'none'
  clone.style.borderBottom = 'none'
  clone.style.overflow   = 'visible'
  clone.style.width      = `${paper.width}px`
  // Sidebar layout needs a fixed height so its flex children fill correctly;
  // other layouts can grow naturally.
  if (isSidebar) {
    clone.style.height   = `${paper.height}px`
  } else {
    clone.style.height   = 'auto'
    clone.style.minHeight = `${paper.height}px`
  }

  const cssText = collectCSS()

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escHtml(title)}</title>
<style>
${cssText}
@page { size: ${paper.cssPageSize}; margin: 0; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 0; background: white; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) {
    alert('Pop-up blocked — please allow pop-ups for this site, then try again.')
    return
  }
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 400)
}
