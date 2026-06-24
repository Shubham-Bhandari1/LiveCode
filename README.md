# Real-Time Collaborative Code Editor

A browser-based collaborative development environment that allows multiple users to write, edit, execute, and communicate in real time. The platform combines live code synchronization, integrated terminal access, voice communication, project persistence, and secure code execution to provide an experience similar to modern cloud IDEs.

---

## Features

### Real-Time Collaboration

* Multiple users can edit code simultaneously.
* Instant synchronization across all connected clients.
* Conflict-free editing using CRDTs powered by Yjs.
* Automatic recovery from connection interruptions.

### Integrated Code Editor

* Built with Monaco Editor (VS Code editor engine).
* Syntax highlighting for multiple languages.
* Auto-completion and intelligent code editing features.
* File and folder management similar to VS Code.

### Project File Management

* Create, rename, move, and delete files/folders.
* Tree-based file explorer.
* Persistent project structure stored in MongoDB.

### Built-in Terminal

* Browser-based terminal powered by Xterm.js.
* Real shell sessions through node-pty.
* Supports command execution within isolated environments.

### Voice Communication

* Peer-to-peer voice chat using WebRTC.
* Low-latency audio communication between collaborators.
* Backend used only for signaling.

### Secure Code Execution

* Docker-based sandbox environment.
* Language-specific execution containers.
* Isolated runtime to protect the host system.

### Project Persistence & History

* Automatic project saving.
* Debounced state persistence for better performance.
* Snapshot-based version history and rollback support.

### Authentication & Access Control

* User registration and login.
* JWT or Firebase Authentication support.
* Protected projects and collaboration permissions.

---

# System Architecture

## Frontend

### Framework

* React.js / Next.js

### Editor

* Monaco Editor

### Terminal

* Xterm.js

### File Explorer

* react-complex-tree

### State Management

* Redux or Zustand

### Real-Time Communication

* socket.io-client

---

## Backend

### Runtime Environment

* Node.js

### Framework

* Express.js

### WebSocket Layer

* Socket.IO

### Terminal Management

* node-pty

### Scaling Support

* Redis Adapter (optional)

---

## Collaboration Engine

### CRDT Synchronization

The editor uses Yjs to manage collaborative editing through Conflict-Free Replicated Data Types (CRDTs). This enables:

* Real-time synchronization
* Offline editing support
* Automatic conflict resolution
* Reduced dependency on a central authority

### Voice Communication

Voice communication is implemented using WebRTC.

Workflow:

1. User joins a collaboration room.
2. Backend exchanges signaling information.
3. Peer-to-peer connection is established.
4. Audio streams directly between participants.

---

## Database Layer

### Database

MongoDB

### Stored Data

* User accounts
* Project metadata
* File structures
* Code snapshots
* Collaboration settings

### Persistence Strategy

* Debounced save operations
* Periodic snapshot generation
* Version history management

---

## Code Execution Architecture

For security reasons, code execution never occurs directly on the server.

### Execution Flow

1. User submits code.
2. Backend sends request to Docker runner.
3. Container executes code in isolation.
4. Output is streamed back to the client.
5. Container is destroyed after execution.

### Benefits

* Isolation from host machine
* Multi-language support
* Improved security
* Resource management

---

## Tech Stack

| Layer                | Technology          |
| -------------------- | ------------------- |
| Frontend             | React / Next.js     |
| Editor               | Monaco Editor       |
| Terminal UI          | Xterm.js            |
| File Explorer        | react-complex-tree  |
| State Management     | Redux / Zustand     |
| Real-Time Sync       | Socket.IO           |
| Collaboration Engine | Yjs (CRDT)          |
| Backend              | Node.js + Express   |
| Terminal Controller  | node-pty            |
| Voice Chat           | WebRTC              |
| Database             | MongoDB             |
| Authentication       | Firebase Auth / JWT |
| Scaling              | Redis               |
| Containerization     | Docker              |
| Frontend Hosting     | Vercel / Netlify    |
| Backend Hosting      | Render / Heroku     |
| Database Hosting     | MongoDB Atlas       |

---

## Future Improvements

* Screen sharing
* Collaborative debugging
* Live cursor indicators
* AI-assisted coding support
* Project templates
* GitHub integration
* Video conferencing
* Team workspaces
* Real-time code reviews

---

## Deployment

### Frontend

Deploy on:

* Vercel
* Netlify

### Backend

Deploy on:

* Render
* Heroku
* VPS Infrastructure

### Database

Deploy on:

* MongoDB Atlas

---

## Goal

The objective of this project is to create a collaborative cloud IDE that combines real-time editing, communication, project management, and secure code execution into a single platform, enabling teams to code together from anywhere.
