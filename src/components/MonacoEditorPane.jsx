import React, { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import useEditorStore from '../store/editorStore'
import { getOrCreateYDoc } from '../services/yjsService'

// ─────────────────────────────────────────────
//  Custom Monaco theme — matches LiveCode dark
// ─────────────────────────────────────────────
const MONACO_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff7b72' },
    { token: 'string', foreground: 'a5d6ff' },
    { token: 'number', foreground: '79c0ff' },
    { token: 'type', foreground: 'ffa657' },
    { token: 'function', foreground: 'd2a8ff' },
    { token: 'variable', foreground: 'e6edf3' },
    { token: 'operator', foreground: 'ff7b72' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#e6edf3',
    'editorCursor.foreground': '#a855f7',
    'editor.lineHighlightBackground': '#161b22',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#8b949e',
    'editor.selectionBackground': '#3d1a6e',
    'editor.inactiveSelectionBackground': '#2d1a4e',
    'editorWidget.background': '#161b22',
    'editorWidget.border': '#30363d',
    'editorSuggestWidget.background': '#161b22',
    'editorSuggestWidget.border': '#30363d',
    'editorSuggestWidget.selectedBackground': '#21262d',
    'input.background': '#0d1117',
    'input.border': '#30363d',
    'scrollbarSlider.background': '#30363d66',
    'scrollbarSlider.hoverBackground': '#484f5866',
    'editorGutter.background': '#0d1117',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
    'editor.findMatchBackground': '#3d1a6e',
    'editor.findMatchHighlightBackground': '#2d1a4e',
  }
}

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  lineHeight: 22,
  minimap: { enabled: true, scale: 1 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'phase',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  suggest: { showKeywords: true, showSnippets: true },
  quickSuggestions: true,
  formatOnPaste: true,
  tabSize: 2,
  wordWrap: 'off',
  padding: { top: 12, bottom: 12 },
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  colorDecorators: true,
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  autoIndent: 'full',
  foldingHighlight: true,
}

function hexToRgba(hex, alpha) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? `rgba(${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)},${alpha})`
    : `rgba(120,100,255,${alpha})`
}

export default function MonacoEditorPane() {
  const {
    openTabs, activeTabId,
    updateTabContent, setCursorPosition, saveActiveTab, getActiveTab,
    remoteCursors, emitMyCursor, emitTyping,
    isConnected, yjsActive, roomId,
  } = useEditorStore()

  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const yjsBindingRef = useRef(null)   // y-monaco MonacoBinding
  const decorationsRef = useRef({})    // remote cursor decorations
  const cursorThrottle = useRef(null)
  const typingTimeout = useRef(null)

  const activeTab = getActiveTab()

  // ─────────────────────────────────────────────
  //  Set up Yjs ↔ Monaco binding for the active file
  // ─────────────────────────────────────────────
  function setupYjsBinding(editor, fileId) {
    // Destroy old binding first
    if (yjsBindingRef.current) {
      yjsBindingRef.current.destroy()
      yjsBindingRef.current = null
    }

    const ydoc = getOrCreateYDoc(fileId)
    const ytext = ydoc.getText('content')
    const model = editor.getModel()

    if (model && ytext) {
      // MonacoBinding keeps Monaco model and Y.Text in perfect sync
      yjsBindingRef.current = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        null   // no awareness here (we use our own cursor system)
      )
    }
  }

  // ─────────────────────────────────────────────
  //  Monaco mount handler
  // ─────────────────────────────────────────────
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor
    monacoRef.current = monaco

    monaco.editor.defineTheme('livecode-dark', MONACO_THEME)
    monaco.editor.setTheme('livecode-dark')

    // Cursor position → status bar + broadcast
    editor.onDidChangeCursorPosition(e => {
      setCursorPosition(e.position.lineNumber, e.position.column)

      if (cursorThrottle.current) clearTimeout(cursorThrottle.current)
      cursorThrottle.current = setTimeout(() => {
        emitMyCursor({ line: e.position.lineNumber, column: e.position.column })
      }, 50)
    })

    // Typing indicator broadcast
    editor.onDidChangeModelContent(() => {
      if (isConnected) {
        emitTyping(true)
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => emitTyping(false), 1500)
      }
    })

    // Ctrl+S → save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveTab()
    })

    // Set up Yjs binding if already connected
    if (yjsActive && activeTab) {
      setupYjsBinding(editor, activeTab.id)
    }

    editor.focus()
  }

  // ─────────────────────────────────────────────
  //  Re-attach Yjs binding when tab or Yjs status changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !activeTabId) return

    if (yjsActive) {
      setupYjsBinding(editor, activeTabId)
    } else {
      // Destroy binding when leaving collab mode
      if (yjsBindingRef.current) {
        yjsBindingRef.current.destroy()
        yjsBindingRef.current = null
      }
    }
  }, [activeTabId, yjsActive])

  // ─────────────────────────────────────────────
  //  Draw remote cursors as Monaco decorations
  // ─────────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTabId) return

    Object.entries(remoteCursors).forEach(([userId, cursor]) => {
      if (!cursor || cursor.fileId !== activeTabId) {
        decorationsRef.current[userId]?.clear()
        return
      }

      const { position, color, name } = cursor
      if (!position) return

      const line = position.line || 1
      const col = position.column || 1
      const safeId = userId.replace(/[^a-z0-9]/gi, '').slice(0, 8)

      // Inject CSS for this user's cursor color
      const styleId = `cursor-style-${safeId}`
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          .rc-${safeId} { border-left: 2px solid ${color} !important; }
          .rcl-${safeId}::before {
            content: "${name}";
            position: absolute;
            top: -18px; left: 0;
            background: ${color};
            color: white;
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 3px;
            white-space: nowrap;
            z-index: 100;
            pointer-events: none;
          }
        `
        document.head.appendChild(style)
      }

      const decs = [
        {
          range: new monaco.Range(line, col, line, col + 1),
          options: {
            className: `rc-${safeId}`,
            beforeContentClassName: `rcl-${safeId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            backgroundColor: hexToRgba(color, 0.05),
          },
        },
      ]

      if (!decorationsRef.current[userId]) {
        decorationsRef.current[userId] = editor.createDecorationsCollection(decs)
      } else {
        decorationsRef.current[userId].set(decs)
      }
    })
  }, [remoteCursors, activeTabId])

  // ─────────────────────────────────────────────
  //  Cleanup on unmount
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      yjsBindingRef.current?.destroy()
      if (cursorThrottle.current) clearTimeout(cursorThrottle.current)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    }
  }, [])

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  if (!activeTab) {
    return (
      <div className="editor-placeholder">
        <div className="placeholder-icon">⚡</div>
        <h2>Welcome to LiveCode</h2>
        <p>Open a file from the explorer to start editing with full syntax highlighting and IntelliSense.</p>
        {isConnected && (
          <div className="collab-hint">
            🧬 CRDTs active — conflict-free editing enabled
          </div>
        )}
        <div className="shortcuts">
          <div className="shortcut-row"><kbd className="kbd">Ctrl</kbd><span>+</span><kbd className="kbd">S</kbd><span>— Save file</span></div>
          <div className="shortcut-row"><kbd className="kbd">Ctrl</kbd><span>+</span><kbd className="kbd">/</kbd><span>— Toggle comment</span></div>
          <div className="shortcut-row"><kbd className="kbd">Ctrl</kbd><span>+</span><kbd className="kbd">Space</kbd><span>— IntelliSense</span></div>
          <div className="shortcut-row"><kbd className="kbd">Alt</kbd><span>+</span><kbd className="kbd">↑/↓</kbd><span>— Move line</span></div>
        </div>
      </div>
    )
  }

  return (
    // key forces Monaco to remount when switching between solo/collab modes
    <Editor
      key={yjsActive ? `yjs-${activeTabId}` : `solo-${activeTabId}`}
      height="100%"
      language={activeTab.language}
      // In Yjs mode: defaultValue only (Yjs controls the content after mount)
      // In solo mode: controlled via value + onChange
      {...(yjsActive
        ? { defaultValue: activeTab.content }
        : {
            value: activeTab.content,
            onChange: (val) => updateTabContent(activeTabId, val || ''),
          }
      )}
      theme="livecode-dark"
      onMount={handleEditorDidMount}
      options={EDITOR_OPTIONS}
    />
  )
}
