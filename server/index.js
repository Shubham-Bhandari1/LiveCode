/**
 * ─────────────────────────────────────────────────────────
 *  LiveCode Server  —  Phase 5: Auth + MongoDB
 * ─────────────────────────────────────────────────────────
 *
 *  What's new in Phase 5:
 *    - MongoDB via Mongoose for persistent storage
 *    - JWT authentication (register / login / /me)
 *    - Projects API (CRUD + file tree persistence)
 *    - All Phase 4 features preserved (node-pty, real-time, Yjs)
 * ─────────────────────────────────────────────────────────
 */

import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import os from 'os'
import mongoose from 'mongoose'

// Routes & middleware
import authRouter from './routes/auth.js'
import projectsRouter from './routes/projects.js'
import authMiddleware from './middleware/authMiddleware.js'

// Try to load node-pty (native module — requires build tools)
let pty
try {
  pty = (await import('node-pty')).default
  console.log('✅ node-pty loaded — real terminal support enabled')
} catch (err) {
  console.warn('⚠️  node-pty not available. Terminal will run in mock mode.')
  console.warn('   To fix: npm install node-pty (may need build tools)')
  pty = null
}

// ─────────────────────────────────────────────
//  MongoDB Connection
// ─────────────────────────────────────────────
async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })
    console.log('✅ MongoDB connected:', process.env.MONGODB_URI)
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    console.warn('⚠️  Running without persistent storage — in-memory mode only')
    // Don't crash; allow server to run for Socket.IO / terminal
  }
}

await connectMongo()

// ─────────────────────────────────────────────
//  Express Setup
// ─────────────────────────────────────────────
const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─────────────────────────────────────────────
//  REST Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/projects', authMiddleware, projectsRouter)

// ─────────────────────────────────────────────
//  Health & Room info endpoints
// ─────────────────────────────────────────────
const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
})

// ─────────────────────────────────────────────
//  In-memory store (Socket.IO state)
// ─────────────────────────────────────────────
const rooms = new Map()
const ptys = new Map()   // terminalId → ptyProcess

const USER_COLORS = [
  '#7c3aed', '#3fb950', '#58a6ff', '#f78166',
  '#e3b341', '#bc8cff', '#4ac26b', '#79c0ff',
]

function getRoomOrCreate(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      documents: new Map(),
      yjsUpdates: new Map(),
    })
  }
  return rooms.get(roomId)
}

function getColorForIndex(i) {
  return USER_COLORS[i % USER_COLORS.length]
}

function getRoomUsers(roomId) {
  const room = rooms.get(roomId)
  if (!room) return []
  return Array.from(room.users.values())
}

// Detect the shell to use
const SHELL = process.platform === 'win32'
  ? 'powershell.exe'
  : (process.env.SHELL || '/bin/bash')

// Working directory for terminals
const CWD = process.cwd()

// ─────────────────────────────────────────────
//  Health endpoints
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    terminals: ptys.size,
    uptime: process.uptime().toFixed(1) + 's',
    ptyAvailable: !!pty,
    shell: SHELL,
    cwd: CWD,
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.get('/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({
    roomId: req.params.roomId,
    users: getRoomUsers(req.params.roomId),
    files: room.documents.size,
    yjsFiles: room.yjsUpdates.size,
  })
})

// ─────────────────────────────────────────────
//  Socket.IO
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`)

  // ── JOIN ROOM ──────────────────────────────
  socket.on('join-room', ({ roomId, username }) => {
    const room = getRoomOrCreate(roomId)
    const user = {
      id: socket.id,
      name: username || `User ${socket.id.slice(0, 4)}`,
      color: getColorForIndex(room.users.size),
      roomId,
      cursor: null,
    }
    room.users.set(socket.id, user)
    socket.join(roomId)

    const documents = {}
    room.documents.forEach((content, fileId) => { documents[fileId] = content })

    socket.emit('room-joined', { user, users: getRoomUsers(roomId), documents })
    socket.to(roomId).emit('user-joined', { user })
    console.log(`👤 ${user.name} joined room ${roomId} (${room.users.size} users)`)
  })

  // ── YJS: State request ──────────────────────
  socket.on('yjs-request-state', ({ roomId, fileId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const updates = room.yjsUpdates.get(fileId) || []
    socket.emit('yjs-state-response', { fileId, updates })
  })

  // ── YJS: Relay update ───────────────────────
  socket.on('yjs-update', ({ roomId, fileId, update }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (!room.yjsUpdates.has(fileId)) room.yjsUpdates.set(fileId, [])
    room.yjsUpdates.get(fileId).push(update)
    socket.to(roomId).emit('yjs-update', { fileId, update })
  })

  // ── CODE CHANGE (plain text fallback) ───────
  socket.on('code-change', ({ roomId, fileId, content }) => {
    const room = rooms.get(roomId)
    if (!room) return
    room.documents.set(fileId, content)
    socket.to(roomId).emit('code-update', { fileId, content, senderId: socket.id })
  })

  // ── CURSOR ──────────────────────────────────
  socket.on('cursor-move', ({ roomId, fileId, position }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const user = room.users.get(socket.id)
    if (user) user.cursor = { fileId, position }
    socket.to(roomId).emit('cursor-update', { userId: socket.id, user, fileId, position })
  })

  // ── FILE OPEN ───────────────────────────────
  socket.on('file-open', ({ roomId, fileId }) => {
    socket.to(roomId).emit('user-file-change', { userId: socket.id, fileId })
  })

  // ── TYPING ──────────────────────────────────
  socket.on('typing-start', ({ roomId, fileId }) => {
    const room = rooms.get(roomId)
    const user = room?.users.get(socket.id)
    if (!user) return
    socket.to(roomId).emit('user-typing', { userId: socket.id, userName: user.name, fileId })
  })
  socket.on('typing-stop', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-typing', { userId: socket.id })
  })

  // ────────────────────────────────────────────
  //  TERMINAL EVENTS  (Phase 4)
  // ────────────────────────────────────────────

  // ── CREATE TERMINAL ─────────────────────────
  socket.on('terminal-create', ({ terminalId }) => {
    if (ptys.has(terminalId)) return // already exists

    if (!pty) {
      // Mock mode: simulate a terminal with echo responses
      socket.emit('terminal-output', {
        terminalId,
        data: '\r\n\x1b[33m⚠️  node-pty not available — running in mock mode\x1b[0m\r\n'
             + '\x1b[90mInstall build tools and run: npm install node-pty\x1b[0m\r\n\r\n'
             + '\x1b[32m$\x1b[0m ',
      })
      ptys.set(terminalId, { mock: true, socketId: socket.id })
      return
    }

    try {
      const ptyProcess = pty.spawn(SHELL, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: CWD,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      })

      // Stream pty output → browser
      ptyProcess.onData(data => {
        socket.emit('terminal-output', { terminalId, data })
      })

      ptyProcess.onExit(({ exitCode }) => {
        socket.emit('terminal-output', {
          terminalId,
          data: `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`,
        })
        ptys.delete(terminalId)
      })

      ptys.set(terminalId, ptyProcess)
      console.log(`🖥️  Terminal ${terminalId} created (pid: ${ptyProcess.pid}, shell: ${SHELL})`)

    } catch (err) {
      console.error('Failed to spawn pty:', err)
      socket.emit('terminal-output', {
        terminalId,
        data: `\r\n\x1b[31mError spawning terminal: ${err.message}\x1b[0m\r\n`,
      })
    }
  })

  // ── TERMINAL INPUT ──────────────────────────
  socket.on('terminal-input', ({ terminalId, data }) => {
    const p = ptys.get(terminalId)
    if (!p) return

    if (p.mock) {
      socket.emit('terminal-output', { terminalId, data: data === '\r' ? '\r\n\x1b[32m$\x1b[0m ' : data })
      return
    }

    p.write(data)
  })

  // ── TERMINAL RESIZE ─────────────────────────
  socket.on('terminal-resize', ({ terminalId, cols, rows }) => {
    const p = ptys.get(terminalId)
    if (!p || p.mock) return
    try {
      p.resize(Math.max(2, cols), Math.max(2, rows))
    } catch (e) {
      // ignore resize errors
    }
  })

  // ── KILL TERMINAL ───────────────────────────
  socket.on('terminal-kill', ({ terminalId }) => {
    const p = ptys.get(terminalId)
    if (p && !p.mock) {
      try { p.kill() } catch (e) {}
    }
    ptys.delete(terminalId)
    console.log(`🗑️  Terminal ${terminalId} killed`)
  })

  // ── DISCONNECT ──────────────────────────────
  socket.on('disconnect', () => {
    // Kill all ptys owned by this socket
    ptys.forEach((p, terminalId) => {
      if (p.socketId === socket.id || (p.mock && p.socketId === socket.id)) {
        if (!p.mock) {
          try { p.kill() } catch (e) {}
        }
        ptys.delete(terminalId)
      }
    })

    // Leave rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id)
        room.users.delete(socket.id)
        io.to(roomId).emit('user-left', { userId: socket.id, userName: user?.name })
        if (room.users.size === 0) {
          rooms.delete(roomId)
          console.log(`🗑️  Room ${roomId} deleted (empty)`)
        }
        console.log(`❌ ${user?.name} left room ${roomId}`)
      }
    })
  })
})

// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   🚀 LiveCode Server  —  Phase 5          ║
  ║   Port: ${PORT}                             ║
  ║   Shell: ${SHELL.padEnd(30)}║
  ║   node-pty: ${pty ? 'enabled ✅' : 'mock mode ⚠️ '}              ║
  ║   MongoDB: ${process.env.MONGODB_URI?.substring(0, 28).padEnd(30)}║
  ╚════════════════════════════════════════════╝
  `)
})
