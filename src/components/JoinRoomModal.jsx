import React, { useState } from 'react'
import useEditorStore from '../store/editorStore'

function generateRoomId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export default function JoinRoomModal({ onClose }) {
  const { joinCollabRoom, isConnecting, connectionError } = useEditorStore()

  const [mode, setMode] = useState('create') // 'create' | 'join'
  const [username, setUsername] = useState('')
  const [roomId, setRoomId] = useState(generateRoomId())
  const [joinRoomId, setJoinRoomId] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const name = username.trim() || 'Anonymous'
    const id = mode === 'create' ? roomId : joinRoomId.trim().toUpperCase()
    if (!id) return
    joinCollabRoom(id, name)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">🤝</span>
            <span>Live Collaboration</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
          <button
            className={`modal-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Alex, Sam, Dev..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          {mode === 'create' ? (
            <div className="form-group">
              <label className="form-label">Room ID</label>
              <div className="form-input-row">
                <input
                  className="form-input"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: 3 }}
                />
                <button
                  type="button"
                  className="form-refresh-btn"
                  onClick={() => setRoomId(generateRoomId())}
                  title="Generate new ID"
                >
                  🔄
                </button>
              </div>
              <span className="form-hint">
                Share this code with your collaborators
              </span>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Room Code</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter room code e.g. AB3X9"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: 3 }}
                maxLength={8}
              />
              <span className="form-hint">
                Ask your teammate for the room code
              </span>
            </div>
          )}

          {connectionError && (
            <div className="form-error">
              ⚠️ {connectionError}
            </div>
          )}

          <div className="modal-info">
            <span>🔒 Private room — only people with the code can join</span>
          </div>

          <button
            type="submit"
            className="modal-submit-btn"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Connecting...</>
            ) : mode === 'create' ? (
              '🚀 Create & Start Coding'
            ) : (
              '🤝 Join Room'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
