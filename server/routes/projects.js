import express from 'express'
import Project from '../models/Project.js'

const router = express.Router()

const DEFAULT_FILE_TREE = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src/index.js',
        name: 'index.js',
        type: 'file',
        language: 'javascript',
        content: '// Welcome to your new LiveCode project!\nconsole.log("Hello, World!")',
      },
      {
        id: 'src/style.css',
        name: 'style.css',
        type: 'file',
        language: 'css',
        content: 'body { margin: 0; font-family: sans-serif; }',
      },
    ],
  },
  {
    id: 'README.md',
    name: 'README.md',
    type: 'file',
    language: 'markdown',
    content: '# My Project\n\nCreated with LiveCode 🚀',
  },
]

// ─────────────────────────────────────────────────────────
//  GET /api/projects  —  list all projects for current user
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id })
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email color')
      .select('-fileTree') // Don't send full file tree in list view
    return res.json(projects)
  } catch (err) {
    console.error('[projects:list]', err)
    return res.status(500).json({ error: 'Failed to fetch projects.' })
  }
})

// ─────────────────────────────────────────────────────────
//  POST /api/projects  —  create a new project
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required.' })
    }

    const project = await Project.create({
      name: name.trim(),
      description: (description || '').trim(),
      owner: req.user.id,
      fileTree: DEFAULT_FILE_TREE,
    })

    await project.populate('owner', 'name email color')

    return res.status(201).json(project)
  } catch (err) {
    console.error('[projects:create]', err)
    return res.status(500).json({ error: 'Failed to create project.' })
  }
})

// ─────────────────────────────────────────────────────────
//  GET /api/projects/:id  —  get a single project
// ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner', 'name email color')

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    if (project.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    return res.json(project)
  } catch (err) {
    console.error('[projects:get]', err)
    return res.status(500).json({ error: 'Failed to fetch project.' })
  }
})

// ─────────────────────────────────────────────────────────
//  PUT /api/projects/:id/save  —  save file tree
// ─────────────────────────────────────────────────────────
router.put('/:id/save', async (req, res) => {
  try {
    const { fileTree } = req.body

    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    project.fileTree = fileTree
    project.updatedAt = new Date()
    await project.save()

    return res.json({ ok: true, savedAt: project.updatedAt })
  } catch (err) {
    console.error('[projects:save]', err)
    return res.status(500).json({ error: 'Failed to save project.' })
  }
})

// ─────────────────────────────────────────────────────────
//  DELETE /api/projects/:id  —  delete a project
// ─────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' })
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    await project.deleteOne()

    return res.json({ ok: true })
  } catch (err) {
    console.error('[projects:delete]', err)
    return res.status(500).json({ error: 'Failed to delete project.' })
  }
})

export default router
