import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import { connectSocket } from '../services/socket'

// ─────────────────────────────────────────────
//  Xterm.js theme matching LiveCode dark
// ─────────────────────────────────────────────
const TERMINAL_THEME = {
  background:    '#0d1117',
  foreground:    '#e6edf3',
  cursor:        '#a855f7',
  cursorAccent:  '#0d1117',
  selectionBackground: '#3d1a6e',

  black:         '#484f58',
  brightBlack:   '#6e7681',
  red:           '#ff7b72',
  brightRed:     '#ffa198',
  green:         '#3fb950',
  brightGreen:   '#56d364',
  yellow:        '#e3b341',
  brightYellow:  '#f2cc60',
  blue:          '#58a6ff',
  brightBlue:    '#79c0ff',
  magenta:       '#bc8cff',
  brightMagenta: '#d2a8ff',
  cyan:          '#76e3ea',
  brightCyan:    '#b3f0ff',
  white:         '#b1bac4',
  brightWhite:   '#f0f6fc',
}

/**
 * A single Xterm.js terminal instance.
 * Each TerminalInstance mounts its own xterm, connects to the server,
 * and handles all I/O for one pty session.
 */
export default function TerminalInstance({ terminalId, isActive }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const socketRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const isInitialized = useRef(false)

  // ── Initialize xterm on mount ───────────────────────────
  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return
    isInitialized.current = true

    // Create terminal
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      theme: TERMINAL_THEME,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowTransparency: false,
      convertEol: true,
    })

    // Addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    const searchAddon = new SearchAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.loadAddon(searchAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    // ── Connect to server ──────────────────────────────────
    const socket = connectSocket()
    socketRef.current = socket

    // Ask server to spawn a pty for this terminal
    socket.emit('terminal-create', { terminalId })

    // Write server output to xterm
    function onOutput({ terminalId: tid, data }) {
      if (tid === terminalId) term.write(data)
    }
    socket.on('terminal-output', onOutput)

    // Send keystrokes to server pty
    term.onData(data => {
      socket.emit('terminal-input', { terminalId, data })
    })

    // ── Resize handling ────────────────────────────────────
    function sendResize() {
      fitAddon.fit()
      socket.emit('terminal-resize', {
        terminalId,
        cols: term.cols,
        rows: term.rows,
      })
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      // Debounce resize
      clearTimeout(resizeObserverRef._timer)
      resizeObserverRef._timer = setTimeout(sendResize, 50)
    })
    resizeObserverRef.current.observe(containerRef.current)

    // Focus terminal
    term.focus()

    return () => {
      socket.off('terminal-output', onOutput)
      socket.emit('terminal-kill', { terminalId })
      resizeObserverRef.current?.disconnect()
      term.dispose()
      isInitialized.current = false
    }
  }, [terminalId])

  // ── Focus when tab becomes active ─────────────────────
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus()
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none',
        background: '#0d1117',
        padding: '4px 8px',
        boxSizing: 'border-box',
      }}
    />
  )
}
