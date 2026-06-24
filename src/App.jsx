import React, { useEffect, useState, useRef, useCallback } from 'react'
import useEditorStore from './store/editorStore'
import useTerminalStore from './store/terminalStore'
import useAuthStore from './store/authStore'
import ActivityBar from './components/ActivityBar'
import FileExplorer from './components/FileExplorer'
import TabBar from './components/TabBar'
import MonacoEditorPane from './components/MonacoEditorPane'
import StatusBar from './components/StatusBar'
import JoinRoomModal from './components/JoinRoomModal'
import CollaboratorsPanel from './components/CollaboratorsPanel'
import TerminalPanel from './components/TerminalPanel'
import AuthScreen from './components/AuthScreen'
import ProjectDashboard from './components/ProjectDashboard'

// ── Resize hook for the terminal panel ─────────────────
function useVerticalResize(initialHeight = 240) {
  const [height, setHeight] = useState(initialHeight)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const onMouseDown = useCallback((e) => {
    isDragging.current = true
    startY.current = e.clientY
    startH.current = height
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (e) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      setHeight(Math.max(80, Math.min(600, startH.current + delta)))
    }

    const onUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [height])

  return { height, onMouseDown }
}

// ── Loading Screen ────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '20px',
          color: 'white',
          boxShadow: '0 0 32px rgba(124,58,237,0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        LC
      </div>
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid rgba(124,58,237,0.2)',
          borderTopColor: '#a855f7',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 32px rgba(124,58,237,0.5); }
          50% { transform: scale(1.05); box-shadow: 0 0 48px rgba(124,58,237,0.7); }
        }
      `}</style>
    </div>
  )
}

// ── Title Bar ────────────────────────────────────────────
function TitleBar({ onOpenCollab }) {
  const { showNotification, isConnected, myUser, collaborators, roomId } = useEditorStore()
  const { currentProject } = useAuthStore()
  const { togglePanel, isOpen: termOpen } = useTerminalStore()
  const allUsers = myUser ? [myUser, ...collaborators] : []

  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        <div className="logo-icon">LC</div>
        <span className="logo-text">LiveCode</span>
      </div>

      <div className="titlebar-menu">
        {['File', 'Edit', 'View', 'Run', 'Terminal', 'Help'].map(item => (
          <div
            key={item}
            className="titlebar-menu-item"
            onClick={item === 'Terminal' ? togglePanel : undefined}
          >
            {item}
          </div>
        ))}
      </div>

      <div className="titlebar-center">
        <div className="titlebar-project-name">
          <span className={`dot ${isConnected ? 'live' : ''}`} />
          <span>
            {currentProject ? currentProject.name : 'livecode-project'}
            {isConnected ? ` · Room ${roomId}` : ' · Phase 5'}
          </span>
        </div>
      </div>

      <div className="titlebar-actions">
        {isConnected && allUsers.length > 0 && (
          <div className="avatar-cluster">
            {allUsers.slice(0, 5).map(u => (
              <div key={u.id} className="avatar" title={u.name} style={{ background: u.color, boxShadow: `0 0 6px ${u.color}88` }}>
                {u.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {!isConnected ? (
          <button className="titlebar-btn collab-btn" onClick={onOpenCollab} id="btn-collab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            Go Live
          </button>
        ) : (
          <div className="live-indicator"><span className="live-ping" />LIVE</div>
        )}

        <button
          className="titlebar-btn secondary"
          onClick={() => {
            if (roomId) { navigator.clipboard.writeText(roomId); showNotification('Room code copied! 📋') }
            else showNotification('Share link copied! 🔗')
          }}
          id="btn-share"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM11 2.5a2.5 2.5 0 11.603 1.628l-6.718 3.12a2.499 2.499 0 010 1.504l6.718 3.12a2.5 2.5 0 11-.488.876l-6.718-3.12a2.5 2.5 0 110-3.256l6.718-3.12A2.5 2.5 0 0111 2.5z"/>
          </svg>
          Share
        </button>

        {/* Terminal toggle */}
        <button
          className={`titlebar-btn secondary ${termOpen ? 'term-active' : ''}`}
          onClick={togglePanel}
          title="Toggle Terminal (Ctrl+`)"
          id="btn-terminal"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM7.25 8a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 11-1.06-1.06L5.44 8 3.72 6.28a.75.75 0 111.06-1.06l2.25 2.25c.141.14.22.331.22.53zm1.5 1.5h3a.75.75 0 010 1.5h-3a.75.75 0 010-1.5z"/>
          </svg>
          Terminal
        </button>
      </div>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────
function Breadcrumb() {
  const { openTabs, activeTabId } = useEditorStore()
  const activeTab = openTabs.find(t => t.id === activeTabId)
  if (!activeTab) return null
  const parts = activeTab.id.split('/')
  return (
    <div className="breadcrumb">
      <span>📦 livecode-project</span>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <span className="breadcrumb-sep">›</span>
          <span className={i === parts.length - 1 ? 'current' : ''}>{part}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ── Notification ──────────────────────────────────────────
function Notification() {
  const { notification } = useEditorStore()
  if (!notification) return null
  return <div className="notification">{notification}</div>
}

// ── Full Editor Layout ────────────────────────────────────
function EditorLayout() {
  const { openFile, isConnected } = useEditorStore()
  const { isOpen: termOpen, height: termHeight, setHeight } = useTerminalStore()
  const { currentProject, saveProjectNow } = useAuthStore()
  const [showCollabModal, setShowCollabModal] = useState(false)
  const { onMouseDown: onResizeMouseDown } = useVerticalResize(termHeight)

  // Open first file when project loads
  useEffect(() => {
    if (currentProject?.fileTree?.length) {
      // already opened by loadProject; this ensures at least one tab is open
    } else {
      openFile('src/index.js')
    }
  }, [])

  // Ctrl+` to toggle terminal
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        useTerminalStore.getState().togglePanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentProject) return
    const id = setInterval(() => {
      saveProjectNow()
    }, 30_000)
    return () => clearInterval(id)
  }, [currentProject, saveProjectNow])

  return (
    <div className="app">
      <TitleBar onOpenCollab={() => setShowCollabModal(true)} />

      <div className="main-body">
        <ActivityBar />
        <FileExplorer />

        {/* Editor + Terminal split */}
        <div className="editor-area">
          {isConnected && <CollaboratorsPanel />}
          <TabBar />
          <Breadcrumb />

          <div className="work-area">
            {/* Monaco Editor */}
            <div className="editor-container" style={termOpen ? { flex: 1, minHeight: 0 } : { flex: 1 }}>
              <MonacoEditorPane />
            </div>

            {/* Resize handle */}
            {termOpen && (
              <div
                className="resize-handle-h"
                onMouseDown={onResizeMouseDown}
                title="Drag to resize"
              />
            )}

            {/* Terminal Panel */}
            {termOpen && (
              <div style={{ height: termHeight, flexShrink: 0, overflow: 'hidden' }}>
                <TerminalPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusBar />
      <Notification />

      {showCollabModal && (
        <JoinRoomModal onClose={() => setShowCollabModal(false)} />
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, currentProject, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <AuthScreen />
  if (!currentProject) return <ProjectDashboard />
  return <EditorLayout />
}
