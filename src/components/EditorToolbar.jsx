import { useRef } from 'react'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import './EditorToolbar.css'

const FONTS = [
  { label: 'Arial',          value: 'Arial, sans-serif' },
  { label: 'Georgia',        value: 'Georgia, serif' },
  { label: 'Garamond',       value: 'Garamond, serif' },
  { label: 'Helvetica',      value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Times New Roman',value: "'Times New Roman', Times, serif" },
  { label: 'Verdana',        value: 'Verdana, sans-serif' },
  { label: 'Calibri',        value: "'Calibri', Candara, sans-serif" },
]

const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28]

export default function EditorToolbar({ editorRef }) {
  const savedRange = useRef(null)

  function saveSelection() {
    const sel = window.getSelection()
    if (sel?.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  function restoreAndFocus() {
    editorRef.current?.focus()
    if (savedRange.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
      savedRange.current = null
    }
  }

  function exec(cmd, value = null) {
    restoreAndFocus()
    document.execCommand(cmd, false, value)
  }

  function applyFontSize(size) {
    restoreAndFocus()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand('fontSize', false, '7')
    const markers = editorRef.current?.querySelectorAll('font[size="7"]') ?? []
    markers.forEach(el => {
      const span = document.createElement('span')
      span.style.fontSize = size
      while (el.firstChild) span.appendChild(el.firstChild)
      el.parentNode?.replaceChild(span, el)
    })
  }

  function prevent(fn) {
    return e => { e.preventDefault(); fn() }
  }

  return (
    <div className="editor-toolbar">
      <button className="tb-btn" onMouseDown={prevent(() => exec('bold'))} title="Bold">
        <strong>B</strong>
      </button>
      <button className="tb-btn italic" onMouseDown={prevent(() => exec('italic'))} title="Italic">
        <em>I</em>
      </button>
      <button className="tb-btn underline" onMouseDown={prevent(() => exec('underline'))} title="Underline">
        <u>U</u>
      </button>

      <div className="tb-sep" />

      {/* Font family dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="tb-select font-select select-trigger"
            onMouseDown={saveSelection}
            title="Font family"
          >
            <span className="select-trigger-label">Font</span>
            <ChevronDownIcon className="select-trigger-chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FONTS.map(f => (
            <DropdownMenuItem
              key={f.value}
              onSelect={() => exec('fontName', f.value)}
            >
              {f.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="tb-select size-select select-trigger"
            onMouseDown={saveSelection}
            title="Font size"
          >
            <span className="select-trigger-label">Size</span>
            <ChevronDownIcon className="select-trigger-chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SIZES.map(s => (
            <DropdownMenuItem
              key={s}
              onSelect={() => applyFontSize(`${s}pt`)}
            >
              {s}pt
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="tb-sep" />

      <button className="tb-btn" onMouseDown={prevent(() => exec('justifyLeft'))} title="Align left">
        <AlignLeft />
      </button>
      <button className="tb-btn" onMouseDown={prevent(() => exec('justifyCenter'))} title="Align center">
        <AlignCenter />
      </button>
      <button className="tb-btn" onMouseDown={prevent(() => exec('justifyRight'))} title="Align right">
        <AlignRight />
      </button>

      <div className="tb-sep" />

      <button className="tb-btn" onMouseDown={prevent(() => exec('insertUnorderedList'))} title="Bullet list">
        <BulletList />
      </button>
      <button className="tb-btn" onMouseDown={prevent(() => exec('insertOrderedList'))} title="Numbered list">
        <NumberedList />
      </button>
    </div>
  )
}

function AlignLeft() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor">
      <rect x="0" y="0" width="15" height="2" rx="1"/>
      <rect x="0" y="4" width="10" height="2" rx="1"/>
      <rect x="0" y="8" width="15" height="2" rx="1"/>
      <rect x="0" y="12" width="8" height="1.5" rx="0.75"/>
    </svg>
  )
}

function AlignCenter() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor">
      <rect x="0" y="0" width="15" height="2" rx="1"/>
      <rect x="2.5" y="4" width="10" height="2" rx="1"/>
      <rect x="0" y="8" width="15" height="2" rx="1"/>
      <rect x="3.5" y="12" width="8" height="1.5" rx="0.75"/>
    </svg>
  )
}

function AlignRight() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor">
      <rect x="0" y="0" width="15" height="2" rx="1"/>
      <rect x="5" y="4" width="10" height="2" rx="1"/>
      <rect x="0" y="8" width="15" height="2" rx="1"/>
      <rect x="7" y="12" width="8" height="1.5" rx="0.75"/>
    </svg>
  )
}

function BulletList() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor">
      <circle cx="1.5" cy="1.5" r="1.5"/>
      <rect x="5" y="0.5" width="10" height="2" rx="1"/>
      <circle cx="1.5" cy="6.5" r="1.5"/>
      <rect x="5" y="5.5" width="10" height="2" rx="1"/>
      <circle cx="1.5" cy="11.5" r="1.5"/>
      <rect x="5" y="10.5" width="10" height="2" rx="1"/>
    </svg>
  )
}

function NumberedList() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor">
      <text x="0" y="3.5" fontSize="4" fontFamily="monospace">1.</text>
      <rect x="5" y="0.5" width="10" height="2" rx="1"/>
      <text x="0" y="8.5" fontSize="4" fontFamily="monospace">2.</text>
      <rect x="5" y="5.5" width="10" height="2" rx="1"/>
      <text x="0" y="13.5" fontSize="4" fontFamily="monospace">3.</text>
      <rect x="5" y="10.5" width="10" height="2" rx="1"/>
    </svg>
  )
}
