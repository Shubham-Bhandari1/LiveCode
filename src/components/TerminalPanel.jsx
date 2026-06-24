import React, { useRef, useCallback, useEffect } from 'react'
import useTerminalStore from '../store/terminalStore'
import useEditorStore from '../store/editorStore'
import TerminalInstance from './TerminalInstance'
import { connectSocket } from '../services/socket'

// ── Language → run command ──────────────────────────────
function getRunCommand(filename, language) {
  if (!filename) return null
  const ext = filename.split('.').pop()
  const commands = {
    js:   `node "${filename}"`,
    jsx:  `node "${filename}"`,
    ts:   `npx tsx "${filename}"`,
    tsx:  `npx tsx "${filename}"`,
    py:   `python3 "${filename}"`,
    go:   `go run "${filename}"`,
    sh:   `bash "${filename}"`,
    rb:   `ruby "${filename}"`,
    rs:   `rustc "${filename}" && ./${filename.replace('.rs', '')}`,
  }
  return commands[ext] || null
}

// ── Icons ───────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 00-1.492-.15l-.66 6.6a.25.25 0 01-.249.225H5.405a.25.25 0 01-.249-.225l-.66-6.6z"/>
  </svg>
)
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
  </svg>
)
const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM7.25 8a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 11-1.06-1.06L5.44 8 3.72 6.28a.75.75 0 111.06-1.06l2.25 2.25c.141.14.22.331.22.53zm1.5 1.5h3a.75.75 0 010 1.5h-3a.75.75 0 010-1.5z"/>
  </svg>
)

export default function TerminalPanel() {
  const {
    isOpen, terminals, activeTerminalId,
    createTerminal, killTerminal, setActiveTerminal, closePanel,
  } = useTerminalStore()

  const { getActiveTab } = useEditorStore()
  const activeTab = getActiveTab()

  // ── Run current file in terminal ──────────────────────
  const handleRunFile = useCallback(() => {
    if (!activeTab) return
    const cmd = getRunCommand(activeTab.name, activeTab.language)
    if (!cmd) return

    let termId = activeTerminalId
    if (!termId) {
      termId = createTerminal()
    }

    // Send the run command to the pty
    const socket = connectSocket()
    setTimeout(() => {
      socket.emit('terminal-input', { terminalId: termId, data: cmd + '\r' })
    }, termId === activeTerminalId ? 0 : 500) // small delay if terminal just created
  }, [activeTab, activeTerminalId, createTerminal])

  if (!isOpen) return null

  return (
    <div className="terminal-panel" id="terminal-panel">
      {/* ── Tab bar ─────────────────────────────────── */}
      <div className="terminal-tabbar">
        <div className="terminal-tabbar-left">
          <span className="terminal-section-label">
            <TerminalIcon />
            TERMINAL
          </span>

          {terminals.map(term => (
            <div
              key={term.id}
              className={`terminal-tab ${term.id === activeTerminalId ? 'active' : ''}`}
              onClick={() => setActiveTerminal(term.id)}
              title={term.name}
            >
              <span className="terminal-tab-icon">$_</span>
              <span className="terminal-tab-name">{term.name}</span>
              <button
                className="terminal-tab-close"
                onClick={e => { e.stopPropagation(); killTerminal(term.id) }}
                title="Close terminal"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            className="terminal-new-btn"
            onClick={createTerminal}
            title="New Terminal (Ctrl+Shift+`)"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="terminal-tabbar-right">
          {/* Run current file button */}
          {activeTab && getRunCommand(activeTab.name, activeTab.language) && (
            <button
              className="terminal-run-btn"
              onClick={handleRunFile}
              title={`Run ${activeTab.name}`}
              id="btn-run-file"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 010 1.393z"/>
              </svg>
              Run {activeTab.name}
            </button>
          )}

          <button
            className="icon-btn"
            onClick={closePanel}
            title="Hide terminal panel"
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      {/* ── Terminal instances ───────────────────────── */}
      <div className="terminal-body">
        {terminals.length === 0 ? (
          <div className="terminal-empty">
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Click <strong style={{ color: 'var(--accent-secondary)' }}>+</strong> to create a terminal
            </span>
          </div>
        ) : (
          terminals.map(term => (
            <TerminalInstance
              key={term.id}
              terminalId={term.id}
              isActive={term.id === activeTerminalId}
            />
          ))
        )}
      </div>
    </div>
  )
}
