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

export function exportPDF(resume) {
  const paper = PAPER_SIZES[resume.styles?.paperSize] ?? PAPER_SIZES.letter
  const { styles, sections, title } = resume

  const sectionsHtml = sections.map(s => `
    <div style="margin-bottom:${styles.sectionSpacing}px">
      <div style="font-size:0.78em;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1E293B;margin-bottom:3px;">${escHtml(s.title)}</div>
      <div style="height:1.5px;background:#1E293B;margin-bottom:5px;"></div>
      <div>${s.content}</div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escHtml(title)}</title>
<style>
  @page {
    size: ${paper.cssPageSize};
    margin: 0;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${styles.fontFamily};
    font-size: ${styles.fontSize}pt;
    line-height: ${styles.lineSpacing};
    padding: ${styles.marginTop}px ${styles.marginRight}px ${styles.marginBottom}px ${styles.marginLeft}px;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  p { margin-bottom: 2px; }
  ul, ol { padding-left: 16px; margin: 2px 0; }
  li { margin-bottom: 1px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: #4F46E5; text-decoration: none; }
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>${sectionsHtml}</body>
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
