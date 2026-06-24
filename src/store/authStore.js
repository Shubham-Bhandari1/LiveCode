import { create } from 'zustand'
import { api } from '../services/api'

// ─────────────────────────────────────────────────────────
//  Helper: debounce
// ─────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─────────────────────────────────────────────────────────
//  Zustand Auth Store
// ─────────────────────────────────────────────────────────
const useAuthStore = create((set, get) => {
  // Debounced save — fires 3 seconds after the last call
  const debouncedSave = debounce(async () => {
    const { currentProject, _saveNow } = get()
    if (currentProject) await _saveNow()
  }, 3000)

  return {
    // ── Auth state ─────────────────────────────
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,   // true while checking stored token
    error: null,

    // ── Project state ──────────────────────────
    currentProject: null,
    lastSaved: null,
    isSaving: false,

    // ─────────────────────────────────────────────
    //  AUTH ACTIONS
    // ─────────────────────────────────────────────

    /** Register a new account */
    register: async (name, email, password) => {
      set({ isLoading: true, error: null })
      try {
        const data = await api.post('/api/auth/register', { name, email, password })
        localStorage.setItem('livecode_token', data.token)
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        set({ isLoading: false, error: err.message })
        throw err
      }
    },

    /** Login with email + password */
    login: async (email, password) => {
      set({ isLoading: true, error: null })
      try {
        const data = await api.post('/api/auth/login', { email, password })
        localStorage.setItem('livecode_token', data.token)
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        set({ isLoading: false, error: err.message })
        throw err
      }
    },

    /** Logout: clear all state */
    logout: () => {
      localStorage.removeItem('livecode_token')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        currentProject: null,
        lastSaved: null,
        error: null,
      })
    },

    /** Validate token on app startup */
    loadMe: async () => {
      const token = localStorage.getItem('livecode_token')
      if (!token) {
        set({ isLoading: false })
        return
      }
      try {
        const user = await api.get('/api/auth/me')
        set({ user, token, isAuthenticated: true, isLoading: false })
      } catch (err) {
        // Token invalid or expired — clear it
        localStorage.removeItem('livecode_token')
        set({ isLoading: false, isAuthenticated: false, token: null, user: null })
      }
    },

    // ─────────────────────────────────────────────
    //  PROJECT ACTIONS
    // ─────────────────────────────────────────────

    /** Fetch list of projects for the current user */
    fetchProjects: async () => {
      const projects = await api.get('/api/projects')
      return projects
    },

    /** Create a new project */
    createProject: async (name, description = '') => {
      const project = await api.post('/api/projects', { name, description })
      return project
    },

    /** Load a project into the editor */
    loadProject: async (id) => {
      try {
        const project = await api.get(`/api/projects/${id}`)
        set({ currentProject: project, lastSaved: project.updatedAt })

        // Sync file tree into editorStore
        // Use dynamic import to avoid circular dependencies
        const { default: useEditorStore } = await import('./editorStore')
        const editorStore = useEditorStore.getState()

        // Replace the file tree
        useEditorStore.setState({ fileTree: project.fileTree || [] })

        // Open the first file automatically
        const firstFile = findFirstFile(project.fileTree || [])
        if (firstFile) {
          editorStore.openFile(firstFile.id)
        }

        return project
      } catch (err) {
        console.error('[loadProject]', err)
        throw err
      }
    },

    /** Internal: actually send save request */
    _saveNow: async () => {
      const { currentProject } = get()
      if (!currentProject) return

      set({ isSaving: true })
      try {
        // Get current file tree from editorStore
        const { default: useEditorStore } = await import('./editorStore')
        const { fileTree } = useEditorStore.getState()

        await api.put(`/api/projects/${currentProject._id}/save`, { fileTree })
        set({ lastSaved: new Date().toISOString(), isSaving: false })
      } catch (err) {
        console.error('[saveProject]', err)
        set({ isSaving: false })
      }
    },

    /** Debounced save — call this on any file content change */
    saveProject: () => {
      debouncedSave()
    },

    /** Immediate save (e.g. on Ctrl+S or 30s interval) */
    saveProjectNow: async () => {
      await get()._saveNow()
    },

    /** Delete a project by id */
    deleteProject: async (id) => {
      await api.delete(`/api/projects/${id}`)
    },

    /** Clear error */
    clearError: () => set({ error: null }),
  }
})

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function findFirstFile(nodes) {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

// ─────────────────────────────────────────────
//  Init: check stored token on startup
// ─────────────────────────────────────────────
useAuthStore.getState().loadMe()

export default useAuthStore
