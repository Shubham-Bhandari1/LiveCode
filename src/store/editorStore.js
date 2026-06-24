import { create } from 'zustand'
import { DEFAULT_FILE_TREE, findNodeById } from '../data/fileTree'
import {
  joinRoom, emitCodeChange, emitCursorMove, emitFileOpen,
  leaveRoom, getSocket, connectSocket
} from '../services/socket'
import {
  seedYDocContent, connectFileToRoom, destroyAllYDocs
} from '../services/yjsService'

const useEditorStore = create((set, get) => ({
  // ── File tree ──
  fileTree: DEFAULT_FILE_TREE,

  // ── Open tabs: [{ id, name, language, content, isDirty }] ──
  openTabs: [],
  activeTabId: null,

  // ── UI ──
  sidebarOpen: true,
  activeActivity: 'files',
  cursorPosition: { line: 1, col: 1 },
  notification: null,

  // ── Collaboration ──
  roomId: null,
  username: '',
  myUser: null,
  collaborators: [],
  remoteCursors: {},
  isConnected: false,
  isConnecting: false,
  connectionError: null,

  // ── Yjs ──
  yjsActive: false,           // true once Yjs is wired up
  typingUsers: {},            // { [userId]: { name, fileId } }

  // ─────────────────────────────────────────────
  //  FILE / TAB ACTIONS
  // ─────────────────────────────────────────────
  openFile: (fileId) => {
    const { openTabs, fileTree, roomId, isConnected, myUser } = get()
    const file = findNodeById(fileTree, fileId)
    if (!file || file.type !== 'file') return

    const existing = openTabs.find(t => t.id === fileId)
    if (existing) {
      set({ activeTabId: fileId })
      if (roomId) emitFileOpen(roomId, fileId)
      return
    }

    const newTab = {
      id: file.id,
      name: file.name,
      language: file.language || 'plaintext',
      content: file.content || '',
      isDirty: false,
    }

    set({ openTabs: [...openTabs, newTab], activeTabId: file.id })

    // If in collab mode, wire up Yjs for this file immediately
    if (isConnected && roomId) {
      get()._activateYjsForFile(file.id, file.content || '')
      emitFileOpen(roomId, file.id)
    }
  },

  closeTab: (tabId) => {
    const { openTabs, activeTabId } = get()
    const filtered = openTabs.filter(t => t.id !== tabId)
    let newActive = activeTabId
    if (activeTabId === tabId) {
      const idx = openTabs.findIndex(t => t.id === tabId)
      newActive = filtered[Math.min(idx, filtered.length - 1)]?.id || null
    }
    set({ openTabs: filtered, activeTabId: newActive })
  },

  updateTabContent: (tabId, content, fromRemote = false) => {
    const { openTabs, roomId, yjsActive } = get()
    set({
      openTabs: openTabs.map(t =>
        t.id === tabId ? { ...t, content, isDirty: !fromRemote } : t
      )
    })
    // In non-Yjs mode: broadcast full content (Phase 2 fallback)
    if (!fromRemote && roomId && !yjsActive) {
      emitCodeChange(roomId, tabId, content)
    }
  },

  saveActiveTab: () => {
    const { openTabs, activeTabId } = get()
    set({
      openTabs: openTabs.map(t =>
        t.id === activeTabId ? { ...t, isDirty: false } : t
      )
    })
    get().showNotification('File saved ✓')
  },

  setCursorPosition: (line, col) => set({ cursorPosition: { line, col } }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveActivity: (activity) => set({ activeActivity: activity }),

  toggleFolder: (folderId) => {
    const toggle = (nodes) => nodes.map(n => {
      if (n.id === folderId) return { ...n, isOpen: !n.isOpen }
      if (n.children) return { ...n, children: toggle(n.children) }
      return n
    })
    set(s => ({ fileTree: toggle(s.fileTree) }))
  },

  showNotification: (message) => {
    set({ notification: message })
    setTimeout(() => set({ notification: null }), 2800)
  },

  getActiveTab: () => {
    const { openTabs, activeTabId } = get()
    return openTabs.find(t => t.id === activeTabId) || null
  },

  // ─────────────────────────────────────────────
  //  YJS INTERNALS
  // ─────────────────────────────────────────────
  _activateYjsForFile: (fileId, initialContent) => {
    const { roomId } = get()
    if (!roomId) return

    // Seed the Y.Doc with existing content
    seedYDocContent(fileId, initialContent)

    // Wire up socket sync; callback updates store on every change
    connectFileToRoom(fileId, roomId, (newContent) => {
      set(s => ({
        openTabs: s.openTabs.map(t =>
          t.id === fileId ? { ...t, content: newContent } : t
        )
      }))
    })

    set({ yjsActive: true })
  },

  // ─────────────────────────────────────────────
  //  COLLABORATION ACTIONS
  // ─────────────────────────────────────────────
  joinCollabRoom: (roomId, username) => {
    set({ isConnecting: true, connectionError: null, username, roomId })
    const socket = connectSocket()

    socket.once('room-joined', ({ user, users, documents }) => {
      set({
        myUser: user,
        collaborators: users.filter(u => u.id !== user.id),
        isConnected: true,
        isConnecting: false,
      })

      // Activate Yjs for all currently open tabs
      const { openTabs } = get()
      openTabs.forEach(tab => {
        get()._activateYjsForFile(tab.id, tab.content)
      })

      get().showNotification(`✅ Joined room ${roomId} — CRDTs active! 🧬`)
    })

    socket.on('user-joined', ({ user }) => {
      set(s => ({
        collaborators: [...s.collaborators.filter(c => c.id !== user.id), user]
      }))
      get().showNotification(`👋 ${user.name} joined`)
    })

    socket.on('user-left', ({ userId, userName }) => {
      set(s => ({
        collaborators: s.collaborators.filter(c => c.id !== userId),
        remoteCursors: Object.fromEntries(
          Object.entries(s.remoteCursors).filter(([k]) => k !== userId)
        ),
        typingUsers: Object.fromEntries(
          Object.entries(s.typingUsers).filter(([k]) => k !== userId)
        ),
      }))
      get().showNotification(`👋 ${userName} left`)
    })

    // Phase 2 fallback (non-Yjs plain sync)
    socket.on('code-update', ({ fileId, content }) => {
      const { yjsActive } = get()
      if (!yjsActive) {
        get().updateTabContent(fileId, content, true)
      }
    })

    // Cursor
    socket.on('cursor-update', ({ userId, user, fileId, position }) => {
      set(s => ({
        remoteCursors: {
          ...s.remoteCursors,
          [userId]: { position, fileId, color: user?.color, name: user?.name }
        }
      }))
    })

    // Typing indicators
    socket.on('user-typing', ({ userId, userName, fileId }) => {
      set(s => ({ typingUsers: { ...s.typingUsers, [userId]: { name: userName, fileId } } }))
    })
    socket.on('user-stopped-typing', ({ userId }) => {
      set(s => {
        const next = { ...s.typingUsers }
        delete next[userId]
        return { typingUsers: next }
      })
    })

    socket.on('connect_error', () => {
      set({ isConnecting: false, connectionError: 'Cannot connect. Is the server running?', isConnected: false })
    })

    joinRoom(roomId, username)
  },

  leaveCollabRoom: () => {
    const socket = getSocket()
    if (socket) {
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('code-update')
      socket.off('cursor-update')
      socket.off('user-typing')
      socket.off('user-stopped-typing')
    }
    destroyAllYDocs()
    leaveRoom()
    set({
      roomId: null,
      myUser: null,
      collaborators: [],
      remoteCursors: {},
      isConnected: false,
      isConnecting: false,
      yjsActive: false,
      typingUsers: {},
    })
    get().showNotification('Left the room')
  },

  emitMyCursor: (position) => {
    const { roomId, activeTabId } = get()
    if (roomId && activeTabId) {
      emitCursorMove(roomId, activeTabId, position)
    }
  },

  emitTyping: (isTyping) => {
    const { roomId, activeTabId } = get()
    const socket = getSocket()
    if (!roomId || !socket) return
    if (isTyping) {
      socket.emit('typing-start', { roomId, fileId: activeTabId })
    } else {
      socket.emit('typing-stop', { roomId })
    }
  },
}))

export default useEditorStore
