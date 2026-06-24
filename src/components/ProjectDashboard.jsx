import React, { useState, useEffect, useCallback } from 'react'
import useAuthStore from '../store/authStore'

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
function countFiles(nodes) {
  let count = 0
  for (const n of nodes || []) {
    if (n.type === 'file') count++
    if (n.children) count += countFiles(n.children)
  }
  return count
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────
//  Skeleton loader
// ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {[80, 60, 100].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? '18px' : '12px',
            width: `${w}%`,
            background: 'linear-gradient(90deg, #21262d 25%, #2d333b 50%, #21262d 75%)',
            backgroundSize: '200% 100%',
            borderRadius: '6px',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  New Project Modal
// ─────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required.'); return }
    setLoading(true)
    setError('')
    try {
      await onCreate(name.trim(), description.trim())
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create project.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#161b22',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: '16px',
          padding: '32px',
          width: '440px',
          maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          animation: 'slideUpCard 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🚀
          </div>
          <div>
            <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 700, margin: 0 }}>New Project</h2>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '2px 0 0' }}>Start building something awesome</p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(247,129,102,0.1)', border: '1px solid rgba(247,129,102,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f78166', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Project Name *
            </label>
            <input
              id="new-project-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#e6edf3',
                fontSize: '14px',
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.2)' }}
              onBlur={(e) => { e.target.style.borderColor = '#30363d'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Description (optional)
            </label>
            <textarea
              id="new-project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building?"
              rows={3}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#e6edf3',
                fontSize: '14px',
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.2)' }}
              onBlur={(e) => { e.target.style.borderColor = '#30363d'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                background: 'transparent',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#8b949e',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '11px',
                background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Creating…
                </>
              ) : '🚀 Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Project card
// ─────────────────────────────────────────────────────────
function ProjectCard({ project, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const fileCount = countFiles(project.fileTree || [])
  const initials = project.name.slice(0, 2).toUpperCase()
  const colors = ['#7c3aed', '#3fb950', '#58a6ff', '#f78166', '#e3b341', '#bc8cff']
  const color = colors[project.name.charCodeAt(0) % colors.length]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1c2128' : '#161b22',
        border: `1px solid ${hovered ? 'rgba(124,58,237,0.4)' : '#30363d'}`,
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(124,58,237,0.2)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* glow accent */}
      {hovered && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}33, ${color}55)`,
            border: `1px solid ${color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 800,
            color,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: '#e6edf3',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {project.name}
          </h3>
          {project.description && (
            <p style={{
              color: '#8b949e',
              fontSize: '12px',
              margin: '4px 0 0',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.5,
            }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)',
          borderRadius: '8px', padding: '3px 8px', fontSize: '11px', color: '#58a6ff',
        }}>
          📄 {fileCount} file{fileCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '11px', color: '#484f58', marginLeft: 'auto' }}>
          {formatDate(project.updatedAt)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          id={`open-project-${project._id}`}
          onClick={(e) => { e.stopPropagation(); onOpen(project._id) }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            border: 'none',
            borderRadius: '7px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(124,58,237,0.3)',
          }}
        >
          ▶ Open
        </button>
        <button
          id={`delete-project-${project._id}`}
          onClick={(e) => { e.stopPropagation(); onDelete(project._id) }}
          title="Delete project"
          style={{
            width: '34px',
            background: 'rgba(247,129,102,0.1)',
            border: '1px solid rgba(247,129,102,0.2)',
            borderRadius: '7px',
            color: '#f78166',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      gap: '16px',
      color: '#8b949e',
      textAlign: 'center',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #7c3aed22, #a855f722)',
        border: '2px dashed rgba(124,58,237,0.3)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        animation: 'float 3s ease-in-out infinite',
      }}>
        🚀
      </div>
      <h3 style={{ color: '#e6edf3', fontSize: '18px', fontWeight: 600, margin: 0 }}>No projects yet</h3>
      <p style={{ fontSize: '13px', maxWidth: '280px', lineHeight: 1.6 }}>
        Create your first LiveCode project and start building something amazing.
      </p>
      <button
        onClick={onCreate}
        style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif",
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          marginTop: '4px',
        }}
      >
        + Create First Project
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Main Dashboard
// ─────────────────────────────────────────────────────────
export default function ProjectDashboard() {
  const { user, logout, fetchProjects, createProject, loadProject, deleteProject } = useAuthStore()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch (err) {
      setError(err.message || 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }, [fetchProjects])

  useEffect(() => { load() }, [load])

  const handleCreate = async (name, description) => {
    const project = await createProject(name, description)
    // Immediately open it
    await handleOpen(project._id)
  }

  const handleOpen = async (id) => {
    setOpeningId(id)
    try {
      await loadProject(id)
    } catch (err) {
      setError(err.message || 'Failed to load project.')
      setOpeningId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p._id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete project.')
    }
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0d1117',
      overflow: 'auto',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#e6edf3',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(13,17,23,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #21262d',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        zIndex: 100,
        gap: '16px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '30px',
            height: '30px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px',
            color: 'white',
            boxShadow: '0 0 12px rgba(124,58,237,0.4)',
          }}>LC</div>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #a855f7, #58a6ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>LiveCode</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* User avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${user?.color || '#7c3aed'}, #a855f7)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            color: 'white',
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}>
            {user?.name}
          </span>
        </div>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={logout}
          style={{
            padding: '7px 14px',
            background: 'rgba(247,129,102,0.1)',
            border: '1px solid rgba(247,129,102,0.25)',
            borderRadius: '7px',
            color: '#f78166',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(247,129,102,0.2)' }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(247,129,102,0.1)' }}
        >
          Sign Out
        </button>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Welcome back,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #a855f7, #58a6ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {user?.name?.split(' ')[0] || 'Developer'}
            </span>{' '}
            👋
          </h1>
          <p style={{ color: '#8b949e', marginTop: '8px', fontSize: '14px' }}>
            {projects.length > 0
              ? `You have ${projects.length} project${projects.length !== 1 ? 's' : ''}. What are you working on today?`
              : 'Ready to build something amazing? Create your first project.'}
          </p>
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#484f58',
              pointerEvents: 'none',
            }}>
              🔍
            </span>
            <input
              id="search-projects"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              style={{
                width: '100%',
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '10px 14px 10px 36px',
                color: '#e6edf3',
                fontSize: '13px',
                fontFamily: "'Inter', system-ui, sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = '#30363d'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* New project button */}
          <button
            id="btn-new-project"
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)' }}
          >
            + New Project
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(247,129,102,0.1)',
            border: '1px solid rgba(247,129,102,0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#f78166',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Project grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setShowModal(true)} />
          ) : (
            filtered.map((project) => (
              openingId === project._id ? (
                <div key={project._id} style={{
                  background: '#161b22',
                  border: '1px solid rgba(124,58,237,0.4)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  minHeight: '160px',
                }}>
                  <div style={{ width: '28px', height: '28px', border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ color: '#8b949e', fontSize: '13px' }}>Opening {project.name}…</span>
                </div>
              ) : (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                />
              )
            ))
          )}
        </div>
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea { color: #e6edf3; }
        textarea::placeholder { color: #484f58; }
        input::placeholder { color: #484f58; }
      `}</style>
    </div>
  )
}
