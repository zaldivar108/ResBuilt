import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import ModernLayout from './ModernLayout'
import CompactLayout from './CompactLayout'

const styles = { sectionSpacing: 14 }

function section(over) {
  return { id: over.type, title: over.type, content: `<p>${over.type}-body</p>`, ...over }
}

const SECTIONS = [
  section({ type: 'contact', title: 'Contact', content: '<p><strong>Jordan Lee</strong></p>' }),
  section({ type: 'summary', title: 'Summary' }),
  section({ type: 'experience', title: 'Experience' }),
  section({ type: 'education', title: 'Education' }),
  section({ type: 'skills', title: 'Skills' }),
  section({ type: 'activities', title: 'Activities' }),
]

describe('ModernLayout', () => {
  const template = {
    sidebarSectionTypes: ['contact', 'skills', 'certifications'],
    accentColor: '#1E293B',
    sidebarBg: '#0F172A',
    sidebarColor: '#fff',
  }

  function renderML(sections = SECTIONS) {
    const { container } = render(
      <ModernLayout sections={sections} styles={styles} template={template} />
    )
    const sidebar = container.querySelector('.ml-sidebar')
    const main = container.querySelector('.ml-main')
    return { container, sidebar, main }
  }

  test('routes sidebar-typed sections to the sidebar, the rest to main', () => {
    const { sidebar, main } = renderML()
    expect(sidebar.textContent).toContain('Skills')
    expect(main.textContent).toContain('Summary')
    expect(main.textContent).toContain('Experience')
    expect(main.textContent).toContain('Education')
    expect(main.textContent).toContain('Activities')
    // main must not contain a sidebar-typed section
    expect(main.textContent).not.toContain('Skills')
  })

  test('contact renders as a special block without a heading', () => {
    const { sidebar } = renderML()
    expect(sidebar.querySelector('.ml-sb-contact')).toBeTruthy()
    expect(sidebar.textContent).toContain('Jordan Lee')
    // contact title itself is not rendered as a heading
    expect(sidebar.querySelector('.ml-sb-heading')?.textContent).not.toBe('Contact')
  })

  test('non-contact sidebar sections get a heading + body', () => {
    const { sidebar } = renderML()
    const heading = sidebar.querySelector('.ml-sb-heading')
    expect(heading.textContent).toBe('Skills')
    expect(sidebar.querySelector('.ml-sb-body').innerHTML).toContain('skills-body')
  })

  test('hidden sections are dropped from both columns', () => {
    const sections = SECTIONS.map(s =>
      s.type === 'skills' ? { ...s, hidden: true } : s
    )
    const { sidebar, main } = renderML(sections)
    expect(sidebar.textContent).not.toContain('Skills')
    expect(main.textContent).not.toContain('Skills')
  })

  test('applies section spacing from styles', () => {
    const { main } = renderML()
    const first = main.querySelector('.ml-main-section')
    expect(first.style.marginBottom).toBe('14px')
  })
})

describe('CompactLayout', () => {
  const template = { accentColor: '#1E293B' }

  function renderCL(sections = SECTIONS) {
    const { container } = render(
      <CompactLayout sections={sections} styles={styles} template={template} />
    )
    return {
      header: container.querySelector('.cp-header'),
      mainCol: container.querySelector('.cp-col-main'),
      sideCol: container.querySelector('.cp-col-side'),
    }
  }

  test('contact goes into the full-width header, not a column', () => {
    const { header, mainCol, sideCol } = renderCL()
    expect(header.textContent).toContain('Jordan Lee')
    expect(mainCol.textContent).not.toContain('Jordan Lee')
    expect(sideCol.textContent).not.toContain('Jordan Lee')
  })

  test('narrative types fill the main column', () => {
    const { mainCol } = renderCL()
    expect(mainCol.textContent).toContain('Summary')
    expect(mainCol.textContent).toContain('Experience')
    expect(mainCol.textContent).toContain('Education')
  })

  test('non-narrative types fall to the side column', () => {
    const { mainCol, sideCol } = renderCL()
    expect(sideCol.textContent).toContain('Skills')
    expect(sideCol.textContent).toContain('Activities')
    expect(mainCol.textContent).not.toContain('Skills')
  })

  test('omits the header entirely when there is no contact section', () => {
    const noContact = SECTIONS.filter(s => s.type !== 'contact')
    const { header } = renderCL(noContact)
    expect(header).toBeNull()
  })

  test('hidden contact drops the header', () => {
    const sections = SECTIONS.map(s =>
      s.type === 'contact' ? { ...s, hidden: true } : s
    )
    const { header } = renderCL(sections)
    expect(header).toBeNull()
  })
})
