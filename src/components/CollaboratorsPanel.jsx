import React, { useState } from 'react'
import useEditorStore from '../store/editorStore'

export default function CollaboratorsPanel() {
  const { roomId, myUser, collaborators, isConnected, leaveCollabRoom, showNotification, typingUsers, yjsActive } = useEditorStore()
  const [copied, setCopied] = useState(false)

  const allUsers = myUser ? [myUser, ...collaborators] : collaborators

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '')
    setCopied(true)
    showNotification('Room code copied! 📋')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isConnected) return null

  // Who's currently typing?
  const typingNames = Object.values(typingUsers).map(u => u.name)

  return (
    <div className="collab-panel">
      <div className="collab-panel-header">
        <div className="collab-live-badge">
          <span className="live-dot" />
          LIVE
        </div>

        {/* CRDT badge */}
        {yjsActive && (
          <div className="crdt-badge" title="Conflict-free editing via Yjs CRDTs">
            🧬 CRDT
          </div>
        )}

        <span className="collab-room-label">Room</span>
        <button className="collab-room-id" onClick={copyRoomId} title="Click to copy">
          <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: 2 }}>{roomId}</span>
          <span style={{ fontSize: 10 }}>{copied ? '✓' : '📋'}</span>
        </button>

        <button className="collab-leave-btn" title="Leave room" onClick={leaveCollabRoom}>✕</button>
      </div>

      <div className="collab-users">
        {allUsers.map(user => (
          <div key={user.id} className="collab-user" title={user.name}>
            <div
              className="collab-avatar"
              style={{ background: user.color, boxShadow: `0 0 8px ${user.color}66` }}
            >
              {user.name[0]?.toUpperCase()}
            </div>
            <span className="collab-user-name">
              {user.name}
              {user.id === myUser?.id && <span className="you-tag"> (you)</span>}
            </span>
            {/* Typing indicator per user */}
            {typingUsers[user.id] && (
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>
            )}
            <span className="collab-user-dot" style={{ background: user.color }} />
          </div>
        ))}
      </div>

      {/* Global typing indicator bar */}
      {typingNames.length > 0 && (
        <div className="typing-bar">
          <span className="typing-dots-inline">
            <span /><span /><span />
          </span>
          <span>
            {typingNames.slice(0, 2).join(', ')}
            {typingNames.length > 2 ? ` +${typingNames.length - 2}` : ''}
            {' '}
            {typingNames.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}
    </div>
  )
}
