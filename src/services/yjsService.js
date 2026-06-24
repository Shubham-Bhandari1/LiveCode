/**
 * ─────────────────────────────────────────────────────────
 *  yjsService.js  —  Phase 3: CRDT document management
 * ─────────────────────────────────────────────────────────
 *
 *  HOW Yjs WORKS (for learning):
 *
 *  1. Every open file gets its own Y.Doc (a CRDT document).
 *  2. When you type, Yjs records the change as a tiny binary
 *     "update" (just the delta, not the whole file).
 *  3. We send that binary update via Socket.IO to the server.
 *  4. The server broadcasts it to all other users in the room.
 *  5. Each user applies the update to their Y.Doc.
 *  6. Yjs automatically merges concurrent edits without conflict.
 *
 *  Key insight: the server doesn't need to understand CRDTs.
 *  It's just a relay. All the magic happens client-side.
 * ─────────────────────────────────────────────────────────
 */

import * as Y from 'yjs'
import { getSocket } from './socket'

// One Y.Doc per open file  (fileId → Y.Doc)
const ydocs = new Map()

// Cleanup functions per file  (fileId → () => void)
const cleanups = new Map()

// ─────────────────────────────────────────────
//  DOCUMENT MANAGEMENT
// ─────────────────────────────────────────────

/** Get existing Y.Doc or create a new one for this file */
export function getOrCreateYDoc(fileId) {
  if (!ydocs.has(fileId)) {
    ydocs.set(fileId, new Y.Doc())
  }
  return ydocs.get(fileId)
}

/**
 * Seed a Y.Doc with initial file content (only if empty).
 * We mark this as 'init' origin so it's NOT broadcast to peers.
 */
export function seedYDocContent(fileId, content) {
  const ydoc = getOrCreateYDoc(fileId)
  const ytext = ydoc.getText('content')

  if (ytext.length === 0 && content) {
    ydoc.transact(() => {
      ytext.insert(0, content)
    }, 'init')
  }

  return { ydoc, ytext }
}

// ─────────────────────────────────────────────
//  SOCKET ↔ YJS SYNC
// ─────────────────────────────────────────────

/**
 * Connect a Y.Doc to the Socket.IO room for real-time sync.
 *
 * @param {string} fileId   - The file being edited
 * @param {string} roomId   - The collaboration room
 * @param {Function} onContentChange - Called with new content string on every local edit
 * @returns {Function} cleanup - Call this when the file is closed
 */
export function connectFileToRoom(fileId, roomId, onContentChange) {
  // Disconnect previous sync for this file
  if (cleanups.has(fileId)) {
    cleanups.get(fileId)()
  }

  const ydoc = getOrCreateYDoc(fileId)
  const ytext = ydoc.getText('content')
  const socket = getSocket()

  // 1) Request full CRDT history from server (for late joiners)
  socket.emit('yjs-request-state', { roomId, fileId })

  // 2) Apply full state snapshot from server
  function onStateResponse({ fileId: fid, updates }) {
    if (fid !== fileId) return
    // Apply all historical updates to get the current state
    updates.forEach(update => {
      Y.applyUpdate(ydoc, new Uint8Array(update), 'remote')
    })
  }

  // 3) Apply live incremental updates from other clients
  function onRemoteUpdate({ fileId: fid, update }) {
    if (fid !== fileId) return
    Y.applyUpdate(ydoc, new Uint8Array(update), 'remote')
  }

  // 4) Send MY local updates to server
  function onLocalUpdate(update, origin) {
    // Don't re-broadcast remote updates or init seeding
    if (origin === 'remote' || origin === 'init') return

    socket.emit('yjs-update', {
      roomId,
      fileId,
      update: Array.from(update), // Uint8Array → regular Array for JSON
    })

    // Keep Zustand store in sync so Ctrl+S saves latest
    if (onContentChange) {
      onContentChange(ytext.toString())
    }
  }

  socket.on('yjs-state-response', onStateResponse)
  socket.on('yjs-update', onRemoteUpdate)
  ydoc.on('update', onLocalUpdate)

  // Also sync store when remote edits arrive
  ytext.observe(() => {
    if (onContentChange) {
      onContentChange(ytext.toString())
    }
  })

  const cleanup = () => {
    socket.off('yjs-state-response', onStateResponse)
    socket.off('yjs-update', onRemoteUpdate)
    ydoc.off('update', onLocalUpdate)
  }

  cleanups.set(fileId, cleanup)
  return cleanup
}

// ─────────────────────────────────────────────
//  CLEANUP
// ─────────────────────────────────────────────

/** Disconnect all files and destroy all Y.Docs (called on leave room) */
export function destroyAllYDocs() {
  cleanups.forEach(fn => fn())
  cleanups.clear()
  ydocs.forEach(doc => doc.destroy())
  ydocs.clear()
}
