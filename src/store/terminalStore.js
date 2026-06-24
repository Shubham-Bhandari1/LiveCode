import { create } from 'zustand'

const useTerminalStore = create((set, get) => ({
  // Panel visibility & size
  isOpen: false,
  height: 240,    // px

  // Terminal instances: [{ id, name, createdAt }]
  terminals: [],
  activeTerminalId: null,

  // Socket ref (set by Terminal.jsx after connection)
  _socketRef: null,

  // ── PANEL ──────────────────────────────────────────
  openTerminal: () => {
    set({ isOpen: true })
    // Auto-create first terminal if none exist
    const { terminals } = get()
    if (terminals.length === 0) {
      get().createTerminal()
    }
  },

  closePanel: () => set({ isOpen: false }),

  togglePanel: () => {
    const { isOpen } = get()
    if (isOpen) {
      set({ isOpen: false })
    } else {
      get().openTerminal()
    }
  },

  setHeight: (h) => set({ height: Math.max(100, Math.min(600, h)) }),

  // ── TERMINALS ──────────────────────────────────────
  createTerminal: () => {
    const id = `term-${Date.now()}`
    const num = get().terminals.length + 1
    const newTerm = { id, name: `bash ${num}`, createdAt: Date.now() }

    set(s => ({
      terminals: [...s.terminals, newTerm],
      activeTerminalId: id,
      isOpen: true,
    }))

    return id
  },

  killTerminal: (id) => {
    const { terminals, activeTerminalId } = get()
    const filtered = terminals.filter(t => t.id !== id)
    let newActive = activeTerminalId

    if (activeTerminalId === id) {
      const idx = terminals.findIndex(t => t.id === id)
      newActive = filtered[Math.min(idx, filtered.length - 1)]?.id || null
    }

    set({ terminals: filtered, activeTerminalId: newActive })

    if (filtered.length === 0) {
      set({ isOpen: false })
    }
  },

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  renameTerminal: (id, name) => {
    set(s => ({
      terminals: s.terminals.map(t => t.id === id ? { ...t, name } : t)
    }))
  },

  getActiveTerminal: () => {
    const { terminals, activeTerminalId } = get()
    return terminals.find(t => t.id === activeTerminalId) || null
  },
}))

export default useTerminalStore
