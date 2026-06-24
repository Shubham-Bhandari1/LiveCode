import React from 'react'
import useEditorStore from '../store/editorStore'

function getLangBadgeClass(language) {
  const map = {
    javascript: 'js', typescript: 'ts', css: 'css',
    html: 'html', json: 'json', markdown: 'md',
  }
  return map[language] || 'js'
}

function getLangLabel(language) {
  const map = {
    javascript: 'JavaScript', typescript: 'TypeScript',
    css: 'CSS', html: 'HTML', json: 'JSON',
    markdown: 'Markdown', python: 'Python', go: 'Go',
    plaintext: 'Plain Text',
  }
  return map[language] || language
}

export default function TabBar() {
  const { openTabs, activeTabId, closeTab, openFile } = useEditorStore()

  if (openTabs.length === 0) return (
    <div className="tab-bar" style={{ alignItems: 'center', padding: '0 12px' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        No files open — click a file in the explorer
      </span>
    </div>
  )

  return (
    <div className="tab-bar">
      {openTabs.map(tab => (
        <div
          key={tab.id}
          id={`tab-${tab.id.replace(/[^a-zA-Z0-9]/g, '-')}`}
          className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => openFile(tab.id)}
        >
          {tab.isDirty && <span className="tab-dot" title="Unsaved changes" />}

          <span className={`lang-badge ${getLangBadgeClass(tab.language)}`}>
            {tab.name.split('.').pop()}
          </span>

          <span>{tab.name}</span>

          <button
            className="tab-close"
            title="Close tab"
            onClick={e => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
