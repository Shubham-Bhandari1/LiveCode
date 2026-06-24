import React from 'react'
import useEditorStore from '../store/editorStore'

// File icon mapping based on extension
function getFileIcon(name, isFolder, isOpen) {
  if (isFolder) return isOpen ? '📂' : '📁'
  const ext = name.split('.').pop()
  const icons = {
    js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    css: '🎨', html: '🌐', json: '📋',
    md: '📝', py: '🐍', go: '🔵',
    svg: '🖼️', png: '🖼️', jpg: '🖼️',
    gitignore: '🚫', env: '🔑',
  }
  return icons[ext] || '📄'
}

function TreeItem({ node, depth = 0 }) {
  const { openFile, toggleFolder, activeTabId } = useEditorStore()

  const handleClick = () => {
    if (node.type === 'folder') {
      toggleFolder(node.id)
    } else {
      openFile(node.id)
    }
  }

  const isActive = node.id === activeTabId
  const indent = depth * 12

  return (
    <>
      <div
        className={`tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={handleClick}
        title={node.name}
      >
        {node.type === 'folder' && (
          <span className={`arrow ${node.isOpen ? 'open' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3 2l4 3-4 3V2z"/>
            </svg>
          </span>
        )}
        {node.type === 'file' && <span style={{ width: 14 }} />}

        <span className="file-icon">
          {getFileIcon(node.name, node.type === 'folder', node.isOpen)}
        </span>

        <span className="file-name">{node.name}</span>
      </div>

      {node.type === 'folder' && node.isOpen && node.children && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  )
}

export default function FileExplorer() {
  const { fileTree, sidebarOpen } = useEditorStore()

  if (!sidebarOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
        <div className="sidebar-actions">
          <button className="icon-btn" title="New File">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1zm0 1.5L12.5 5H9V2.5zM4 14V2h4v4h4v8H4z"/>
              <path d="M7 9h2v2H7zm0-3h2v1H7z" opacity=".5"/>
            </svg>
          </button>
          <button className="icon-btn" title="New Folder">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3.5A1.5 1.5 0 012.5 2h2.764c.958 0 1.76.56 2.311 1.178L8 4H14a1 1 0 011 1v7.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z"/>
            </svg>
          </button>
          <button className="icon-btn" title="Collapse All">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 9H4V4H3v6h6V9z"/>
              <path d="M13 1H7v6h6V1zm-1 5H8V2h4v4z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="sidebar-header" style={{ paddingTop: 4 }}>
        <span className="sidebar-title" style={{ fontSize: 11 }}>
          📦 livecode-project
        </span>
      </div>

      <div className="file-tree">
        {fileTree.map(node => (
          <TreeItem key={node.id} node={node} />
        ))}
      </div>
    </div>
  )
}
