import React from 'react'
import useEditorStore from '../store/editorStore'
import useAuthStore from '../store/authStore'

function getLangLabel(language) {
  const map = {
    javascript: 'JavaScript', typescript: 'TypeScript',
    css: 'CSS', html: 'HTML', json: 'JSON',
    markdown: 'Markdown', python: 'Python', go: 'Go',
    plaintext: 'Plain Text',
  }
  return map[language] || language || 'Plain Text'
}

function formatTime(isoString) {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (e) {
    return ''
  }
}

export default function StatusBar() {
  const { cursorPosition, openTabs, activeTabId } = useEditorStore()
  const { isSaving, lastSaved } = useAuthStore()
  const activeTab = openTabs.find(t => t.id === activeTabId)

  return (
    <div className="status-bar">
      {/* Left items */}
      <div className="status-item" title="Source Control">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
        </svg>
        <span>main</span>
      </div>

      <div className="status-item" title="No errors">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
          <path d="M11.28 6.78L7.03 11.03a.75.75 0 01-1.06 0L4.22 9.28a.75.75 0 011.06-1.06l1.22 1.22 3.72-3.72a.75.75 0 111.06 1.06z"/>
        </svg>
        <span>0 errors</span>
      </div>

      {/* Right items */}
      <div className="status-right">
        {/* Save indicator */}
        <div className="status-item save-indicator" title="Auto-save status">
          {isSaving ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="save-spinner" />
              Saving...
            </span>
          ) : lastSaved ? (
            <span>Saved ✓ {formatTime(lastSaved)}</span>
          ) : (
            <span>Not saved</span>
          )}
        </div>

        {activeTab && (
          <>
            <div className="status-item" title="Cursor position">
              <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
            </div>
            <div className="status-item" title="Encoding">
              <span>UTF-8</span>
            </div>
            <div className="status-item" title="End of line sequence">
              <span>LF</span>
            </div>
            <div className="status-item" title="Language mode">
              <span>{getLangLabel(activeTab.language)}</span>
            </div>
          </>
        )}
        <div className="status-item" title="LiveCode version">
          <span>⚡ LiveCode v0.1</span>
        </div>
      </div>
    </div>
  )
}
