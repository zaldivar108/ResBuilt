import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import {
  Bold, Italic, Underline, Strikethrough, Link,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import './EditorToolbar.css'

/* ── Helpers ── */

function firstFont(str) {
  return str.split(',')[0].trim().replace(/['"]/g, '').toLowerCase()
}

function fontLabelFromFamily(family) {
  if (!family) return 'Font'
  const match = FONTS.find(f => firstFont(f.value) === firstFont(family))
  return match ? match.label : 'Font'
}

function ptFromInline(str) {
  if (!str) return null
  if (str.endsWith('pt')) return Math.round(parseFloat(str))
  if (str.endsWith('px')) return Math.round(parseFloat(str) * 0.75)
  return null
}

function getInlinePt(anchorNode, editorEl) {
  let el = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode
  while (el && el !== editorEl) {
    const pt = ptFromInline(el.style?.fontSize)
    if (pt) return pt
    el = el.parentElement
  }
  return null
}

const FONTS = [
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Garamond',        value: "'EB Garamond', Garamond, serif" },
  { label: 'Helvetica',       value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Calibri',         value: "'Calibri', Candara, sans-serif" },
]

const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28]

/* ── Tooltip ── */

function Tooltip({ label, children }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="tb-tip-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            className="tb-tip"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Icon button ── */

function TbBtn({ icon: Icon, label, active, onMouseDown }) {
  return (
    <Tooltip label={label}>
      <button
        className={`tb-icon-btn${active ? ' active' : ''}`}
        onMouseDown={onMouseDown}
        aria-label={label}
      >
        <Icon size={15} strokeWidth={2} />
      </button>
    </Tooltip>
  )
}

/* ── Main toolbar ── */

export default function EditorToolbar({ editorRef, fontFamily, fontSize }) {
  const savedRange = useRef(null)

  const [activeFontLabel, setActiveFontLabel] = useState(() => fontLabelFromFamily(fontFamily))
  const [activeSizeLabel, setActiveSizeLabel] = useState(() => fontSize ? `${fontSize}pt` : 'Size')
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false,
    strikeThrough: false, justifyLeft: false, justifyCenter: false, justifyRight: false,
    insertUnorderedList: false, insertOrderedList: false,
  })

  useEffect(() => { setActiveFontLabel(fontLabelFromFamily(fontFamily)) }, [fontFamily])
  useEffect(() => { setActiveSizeLabel(fontSize ? `${fontSize}pt` : 'Size') }, [fontSize])

  const resolveState = useCallback(() => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    if (!sel || !editorRef.current.contains(sel.anchorNode)) return

    // Font family
    const raw = document.queryCommandValue('fontName').toLowerCase()
    if (raw) {
      const match = FONTS.find(f => firstFont(f.value) === firstFont(raw))
      setActiveFontLabel(match ? match.label : fontLabelFromFamily(fontFamily))
    } else {
      setActiveFontLabel(fontLabelFromFamily(fontFamily))
    }

    // Font size
    const inlinePt = getInlinePt(sel.anchorNode, editorRef.current)
    setActiveSizeLabel((inlinePt ?? fontSize) ? `${inlinePt ?? fontSize}pt` : 'Size')

    // Format states
    setFmt({
      bold:               document.queryCommandState('bold'),
      italic:             document.queryCommandState('italic'),
      underline:          document.queryCommandState('underline'),
      strikeThrough:      document.queryCommandState('strikeThrough'),
      justifyLeft:        document.queryCommandState('justifyLeft'),
      justifyCenter:      document.queryCommandState('justifyCenter'),
      justifyRight:       document.queryCommandState('justifyRight'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList:  document.queryCommandState('insertOrderedList'),
    })
  }, [editorRef, fontFamily, fontSize])

  useEffect(() => {
    document.addEventListener('selectionchange', resolveState)
    return () => document.removeEventListener('selectionchange', resolveState)
  }, [resolveState])

  function saveSelection() {
    const sel = window.getSelection()
    if (sel?.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
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
    document.execCommand('styleWithCSS', false, false)
    document.execCommand(cmd, false, value)
  }

  function prevent(fn) {
    return e => { e.preventDefault(); fn() }
  }

  function applyFontSize(size) {
    restoreAndFocus()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand('fontSize', false, '7')
    const markers = editorRef.current?.querySelectorAll('font[size="7"]') ?? []
    const newSpans = []
    markers.forEach(el => {
      const span = document.createElement('span')
      span.style.fontSize = size
      while (el.firstChild) span.appendChild(el.firstChild)
      el.parentNode?.replaceChild(span, el)
      newSpans.push(span)
    })
    // Restore selection over the resized content so user can re-apply immediately
    if (newSpans.length > 0) {
      const range = document.createRange()
      range.setStartBefore(newSpans[0])
      range.setEndAfter(newSpans[newSpans.length - 1])
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
    editorRef.current?.dispatchEvent(new InputEvent('input', { bubbles: true }))
  }

  function handleLink() {
    restoreAndFocus()
    const sel = window.getSelection()
    let node = sel?.anchorNode
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (node?.closest('a')) { document.execCommand('unlink'); return }
    const url = window.prompt('Enter URL:', 'https://')
    if (url) document.execCommand('createLink', false, url)
  }

  return (
    <div className="editor-toolbar">
      {/* Formatting */}
      <TbBtn icon={Bold}          label="Bold"          active={fmt.bold}          onMouseDown={prevent(() => exec('bold'))} />
      <TbBtn icon={Italic}        label="Italic"        active={fmt.italic}        onMouseDown={prevent(() => exec('italic'))} />
      <TbBtn icon={Underline}     label="Underline"     active={fmt.underline}     onMouseDown={prevent(() => exec('underline'))} />
      <TbBtn icon={Strikethrough} label="Strikethrough" active={fmt.strikeThrough} onMouseDown={prevent(() => exec('strikeThrough'))} />
      <TbBtn icon={Link}          label="Link"          active={false}             onMouseDown={prevent(handleLink)} />

      <div className="tb-sep" />

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="tb-select font-select select-trigger" onMouseDown={saveSelection}>
            <span className="select-trigger-label">{activeFontLabel}</span>
            <ChevronDownIcon className="select-trigger-chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FONTS.map(f => (
            <DropdownMenuItem key={f.value} onSelect={() => exec('fontName', f.value)}>
              {f.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="tb-select size-select select-trigger" onMouseDown={saveSelection}>
            <span className="select-trigger-label">{activeSizeLabel}</span>
            <ChevronDownIcon className="select-trigger-chevron" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SIZES.map(s => (
            <DropdownMenuItem key={s} onSelect={() => applyFontSize(`${s}pt`)}>
              {s}pt
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="tb-sep" />

      {/* Alignment */}
      <TbBtn icon={AlignLeft}   label="Align Left"   active={fmt.justifyLeft}   onMouseDown={prevent(() => exec('justifyLeft'))} />
      <TbBtn icon={AlignCenter} label="Align Center" active={fmt.justifyCenter} onMouseDown={prevent(() => exec('justifyCenter'))} />
      <TbBtn icon={AlignRight}  label="Align Right"  active={fmt.justifyRight}  onMouseDown={prevent(() => exec('justifyRight'))} />

      <div className="tb-sep" />

      {/* Lists */}
      <TbBtn icon={List}        label="Bullet List"   active={fmt.insertUnorderedList} onMouseDown={prevent(() => exec('insertUnorderedList'))} />
      <TbBtn icon={ListOrdered} label="Numbered List" active={fmt.insertOrderedList}   onMouseDown={prevent(() => exec('insertOrderedList'))} />
    </div>
  )
}
