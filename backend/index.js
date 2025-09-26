const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()
const morgan = require('morgan')

const app = express()

app.use(morgan('dev'))

// CORS Configuration
app.use(
  cors({
    origin: '*', // Add your frontend URLs
    credentials: true,
    methods: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
  })
)

app.use(express.json())

// MongoDB Connection
mongoose.connect(
  'mongodb+srv://sakshamjain0464:pcx9wtREGsLyXsAH@cluster0.6a20xgw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'mb-assignment'
  }
)

// User Schema
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
  },
  { timestamps: true }
)

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)
const Task = mongoose.model('Task', taskSchema)

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const token =
    req.header('Authorization')?.replace('Bearer ', '') ||
    req.header('x-access-token')

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    )
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' })
    }
    req.user = user
    next()
  } catch (error) {
    console.log(error)
    res.status(401).json({ message: 'Invalid token.' })
  }
}

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res
      .status(403)
      .json({ message: 'Access denied. Admin role required.' })
  }
  next()
}

// ===== AUTHENTICATION ROUTES =====

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email or username already exists' })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get Current User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  })
})

// ===== USER MANAGEMENT ROUTES (Admin Only) =====

// Get All Users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Add User (Admin Only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email or username already exists' })
    }

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    })

    await user.save()
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Remove User (Admin Only)
app.delete(
  '/api/users/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id

      // Don't allow admin to delete themselves
      if (userId === req.user._id.toString()) {
        return res
          .status(400)
          .json({ message: 'Cannot delete your own account' })
      }

      const user = await User.findByIdAndDelete(userId)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Also delete all tasks assigned to or created by this user
      await Task.deleteMany({
        $or: [{ assignedTo: userId }, { createdBy: userId }]
      })

      res.json({ message: 'User and associated tasks deleted successfully' })
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// ===== TASK MANAGEMENT ROUTES =====

// Get Tasks with Pagination and Filtering
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, assignedTo } = req.query
    const skip = (page - 1) * limit

    // Build filter query
    let filterQuery = {}

    // If user is not admin, only show tasks assigned to them
    if (req.user.role !== 'admin') {
      filterQuery.assignedTo = req.user._id
    } else if (assignedTo) {
      filterQuery.assignedTo = assignedTo
    }

    if (status) filterQuery.status = status
    if (priority) filterQuery.priority = priority

    const tasks = await Task.find(filterQuery)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Task.countDocuments(filterQuery)

    res.json({
      tasks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Create Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedTo } = req.body

    // Validate assigned user exists
    const assignedUser = await User.findById(assignedTo)
    if (!assignedUser) {
      return res.status(400).json({ message: 'Assigned user not found' })
    }

    const task = new Task({
      title,
      description,
      dueDate: new Date(dueDate),
      priority: priority || 'medium',
      assignedTo,
      createdBy: req.user._id
    })

    await task.save()

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')

    res
      .status(201)
      .json({ message: 'Task created successfully', task: populatedTask })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Update Task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, dueDate, status, priority, assignedTo } =
      req.body
    const taskId = req.params.id

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check permissions
    const canEdit =
      req.user.role === 'admin' ||
      task.createdBy.toString() === req.user._id.toString() ||
      task.assignedTo.toString() === req.user._id.toString()

    if (!canEdit) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // If assignedTo is being changed, validate the new user exists
    if (assignedTo && assignedTo !== task.assignedTo.toString()) {
      const assignedUser = await User.findById(assignedTo)
      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found' })
      }
    }

    // Update fields
    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (dueDate !== undefined) task.dueDate = new Date(dueDate)
    if (status !== undefined) task.status = status
    if (priority !== undefined) task.priority = priority
    if (assignedTo !== undefined) task.assignedTo = assignedTo

    await task.save()

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')

    res.json({ message: 'Task updated successfully', task: updatedTask })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Update Task Status
app.patch('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body
    const taskId = req.params.id

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check permissions
    const canUpdate =
      req.user.role === 'admin' ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString()

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' })
    }

    task.status = status
    await task.save()

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')

    res.json({ message: 'Task status updated successfully', task: updatedTask })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Update Task Priority (Move between priority lists)
app.patch('/api/tasks/:id/priority', authenticateToken, async (req, res) => {
  try {
    const { priority } = req.body
    const taskId = req.params.id

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check permissions
    const canUpdate =
      req.user.role === 'admin' ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString()

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' })
    }

    task.priority = priority
    await task.save()

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')

    res.json({
      message: 'Task priority updated successfully',
      task: updatedTask
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id
    const task = await Task.findById(taskId)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check permissions
    const canDelete =
      req.user.role === 'admin' ||
      task.createdBy.toString() === req.user._id.toString()

    if (!canDelete) {
      return res.status(403).json({
        message: 'Access denied. Only task creator or admin can delete tasks.'
      })
    }

    await Task.findByIdAndDelete(taskId)
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get Tasks by Priority (for visual representation)
app.get(
  '/api/tasks/priority/:priority',
  authenticateToken,
  async (req, res) => {
    try {
      const { priority } = req.params
      let filterQuery = { priority }

      // If user is not admin, only show tasks assigned to them
      if (req.user.role !== 'admin') {
        filterQuery.assignedTo = req.user._id
      }

      const tasks = await Task.find(filterQuery)
        .populate('assignedTo', 'username email')
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })

      res.json({ priority, tasks })
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message })
    }
  }
)

// Get Task Statistics
app.get('/api/tasks/stats', authenticateToken, async (req, res) => {
  try {
    let filterQuery = {}

    // If user is not admin, only show stats for tasks assigned to them
    if (req.user.role !== 'admin') {
      filterQuery.assignedTo = req.user._id
    }

    const stats = await Task.aggregate([
      { $match: filterQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
        }
      }
    ])

    const result = stats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    }

    res.json(result)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check if user has permission to view this task
    if (
      req.user.role !== 'admin' &&
      task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Task Management API is running' })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check available at: http://localhost:${PORT}/api/health`)
})

module.exports = app
