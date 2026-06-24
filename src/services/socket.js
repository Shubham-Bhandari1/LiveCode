import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'

let socket = null

// ─────────────────────────────────────────────
//  Singleton socket instance
// ─────────────────────────────────────────────
export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}

// ─────────────────────────────────────────────
//  Room actions
// ─────────────────────────────────────────────
export function joinRoom(roomId, username) {
  const s = connectSocket()
  s.emit('join-room', { roomId, username })
}

export function emitCodeChange(roomId, fileId, content) {
  socket?.emit('code-change', { roomId, fileId, content })
}

export function emitCursorMove(roomId, fileId, position) {
  socket?.emit('cursor-move', { roomId, fileId, position })
}

export function emitFileOpen(roomId, fileId) {
  socket?.emit('file-open', { roomId, fileId })
}

export function leaveRoom() {
  disconnectSocket()
  socket = null
}
