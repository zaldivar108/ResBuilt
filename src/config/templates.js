export const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    fullName: 'Classic Professional',
    layout: 'classic',
    description: 'ATS-friendly · Single column',
    accentColor: '#1E293B',
    defaultStyles: {
      fontFamily: 'Georgia, serif',
      fontSize: 11,
      lineSpacing: 1.5,
      sectionSpacing: 14,
      marginTop: 54,
      marginRight: 54,
      marginBottom: 54,
      marginLeft: 54,
    },
  },

  modern: {
    id: 'modern',
    name: 'Modern',
    fullName: 'Modern Sidebar',
    layout: 'sidebar',
    description: 'Two-column · Accent sidebar',
    accentColor: '#4F46E5',
    sidebarBg: '#1E293B',
    sidebarColor: '#E2E8F0',
    sidebarWidth: 205,
    // Section types that belong in the left sidebar column
    sidebarSectionTypes: ['contact', 'skills', 'certifications'],
    defaultStyles: {
      fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
      fontSize: 10.5,
      lineSpacing: 1.45,
      sectionSpacing: 14,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    fullName: 'Minimal Clean',
    layout: 'minimal',
    description: 'Clean typography · Whitespace',
    accentColor: '#94A3B8',
    defaultStyles: {
      fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
      fontSize: 11,
      lineSpacing: 1.65,
      sectionSpacing: 22,
      marginTop: 60,
      marginRight: 72,
      marginBottom: 60,
      marginLeft: 72,
    },
  },
}

export const DEFAULT_TEMPLATE_ID = 'classic'

export function getTemplate(id) {
  return TEMPLATES[id] ?? TEMPLATES[DEFAULT_TEMPLATE_ID]
}
