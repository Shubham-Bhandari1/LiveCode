// Default file tree structure for the project
export const DEFAULT_FILE_TREE = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src/App.jsx',
        name: 'App.jsx',
        type: 'file',
        language: 'javascript',
        content: `import React from 'react'

function App() {
  return (
    <div className="App">
      <h1>Hello, LiveCode! 🚀</h1>
      <p>Start editing to see changes in real time.</p>
    </div>
  )
}

export default App`
      },
      {
        id: 'src/index.css',
        name: 'index.css',
        type: 'file',
        language: 'css',
        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #e6edf3;
}

.App {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}`
      },
      {
        id: 'src/main.jsx',
        name: 'main.jsx',
        type: 'file',
        language: 'javascript',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      },
      {
        id: 'src/utils.js',
        name: 'utils.js',
        type: 'file',
        language: 'javascript',
        content: `/**
 * Utility functions for LiveCode
 */

/**
 * Debounce a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Generate a random room ID
 */
export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * Get language from file extension
 */
export function getLanguageFromFilename(filename) {
  const ext = filename.split('.').pop()
  const map = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    css: 'css', html: 'html',
    json: 'json', md: 'markdown',
    py: 'python', go: 'go',
  }
  return map[ext] || 'plaintext'
}`
      }
    ]
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'public/index.html',
        name: 'index.html',
        type: 'file',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LiveCode App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
      }
    ]
  },
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file',
    language: 'json',
    content: `{
  "name": "livecode-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}`
  },
  {
    id: 'README.md',
    name: 'README.md',
    type: 'file',
    language: 'markdown',
    content: `# LiveCode 🚀

A real-time collaborative code editor built with React + Monaco Editor.

## Features

- 🎨 Monaco Editor (same as VS Code)
- 📁 VS Code-like file explorer
- 🌈 Syntax highlighting for 10+ languages
- 🤝 Real-time collaboration (coming soon)
- 💻 Integrated terminal (coming soon)

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tech Stack

- **Frontend**: React + Vite
- **Editor**: Monaco Editor
- **Styling**: Custom CSS (VS Code theme)
- **State**: Zustand
- **Real-time**: Socket.IO (Phase 2)
`
  }
]

// Flatten tree to get all files
export function flattenTree(nodes, result = []) {
  for (const node of nodes) {
    if (node.type === 'file') {
      result.push(node)
    } else if (node.children) {
      flattenTree(node.children, result)
    }
  }
  return result
}

// Find a node by ID
export function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}
