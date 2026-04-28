import { useState, useEffect, useCallback } from 'react'
import './AccentColorPicker.css'

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6; break
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

const PRESETS = [
  '#0F172A', '#4F46E5', '#0891B2', '#16A34A', '#DC2626', '#7C3AED', '#EA580C', '#64748B',
  '#1E293B', '#818CF8', '#22D3EE', '#4ADE80', '#F87171', '#C084FC', '#FB923C', '#94A3B8',
]

function isValidHex(hex) {
  return /^#[0-9a-f]{6}$/i.test(hex)
}

export default function AccentColorPicker({ value, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const [hue, setHue] = useState(0)
  const [sat, setSat] = useState(0)
  const [lit, setLit] = useState(0)

  useEffect(() => {
    const rgb = hexToRgb(value)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    setHue(hsl.h)
    setSat(hsl.s)
    setLit(hsl.l)
    setHexInput(value)
  }, [value])

  const applyHex = useCallback((raw) => {
    const hex = raw.startsWith('#') ? raw : '#' + raw
    if (!isValidHex(hex)) return
    onChange(hex)
  }, [onChange])

  const applyHSL = useCallback((h, s, l) => {
    const rgb = hslToRgb(h, s, l)
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
    onChange(hex)
  }, [onChange])

  const rgb = hexToRgb(value)

  const satGradient = `linear-gradient(to right, hsl(${hue},0%,${lit}%), hsl(${hue},100%,${lit}%))`
  const litGradient = `linear-gradient(to right, hsl(${hue},${sat}%,0%), hsl(${hue},${sat}%,50%), hsl(${hue},${sat}%,100%))`

  return (
    <div className="acp-root">
      <div className="acp-presets">
        {PRESETS.map(color => (
          <button
            key={color}
            className={`accent-swatch${value === color ? ' active' : ''}`}
            style={{ background: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
      </div>

      <button className="acp-toggle" onClick={() => setExpanded(v => !v)}>
        <span>Custom</span>
        <svg
          className={`acp-chevron${expanded ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {expanded && (
        <div className="acp-panel">
          <div className="acp-preview" style={{ background: value }} />

          <div className="acp-field-row">
            <span className="acp-sublabel">HEX</span>
            <input
              className="acp-hex-input"
              type="text"
              value={hexInput}
              spellCheck={false}
              maxLength={7}
              onChange={e => setHexInput(e.target.value)}
              onBlur={() => applyHex(hexInput)}
              onKeyDown={e => e.key === 'Enter' && applyHex(hexInput)}
            />
          </div>

          <div className="acp-rgb-row">
            {[['R', rgb.r], ['G', rgb.g], ['B', rgb.b]].map(([label, val]) => (
              <div className="acp-rgb-chip" key={label}>
                <span className="acp-rgb-label">{label}</span>
                <span className="acp-rgb-val">{val}</span>
              </div>
            ))}
          </div>

          <div className="acp-divider" />

          <div className="acp-slider-group">
            <div className="acp-slider-row">
              <span className="acp-sublabel">H</span>
              <input
                type="range" min="0" max="360" step="1"
                value={hue}
                className="acp-slider acp-slider-hue"
                onChange={e => { const v = +e.target.value; setHue(v); applyHSL(v, sat, lit) }}
              />
              <span className="acp-slider-val">{hue}°</span>
            </div>
            <div className="acp-slider-row">
              <span className="acp-sublabel">S</span>
              <input
                type="range" min="0" max="100" step="1"
                value={sat}
                className="acp-slider"
                style={{ '--track-bg': satGradient }}
                onChange={e => { const v = +e.target.value; setSat(v); applyHSL(hue, v, lit) }}
              />
              <span className="acp-slider-val">{sat}%</span>
            </div>
            <div className="acp-slider-row">
              <span className="acp-sublabel">L</span>
              <input
                type="range" min="0" max="100" step="1"
                value={lit}
                className="acp-slider"
                style={{ '--track-bg': litGradient }}
                onChange={e => { const v = +e.target.value; setLit(v); applyHSL(hue, sat, v) }}
              />
              <span className="acp-slider-val">{lit}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
