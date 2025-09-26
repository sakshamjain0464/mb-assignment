import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  User,
  LogOut,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowUpDown
} from 'lucide-react'
import axios from 'axios'

// This is our main TaskManager component
function TaskManager ({ user, onLogout }) {
  // All our state variables - these hold our data
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [users, setUsers] = useState([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState('desc')

  // Form data for creating/editing tasks
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    assignedTo: user.id
  })

  // When component loads or filters change, fetch tasks
  useEffect(() => {
    getTasks()
    getUsers()
    getStats()
  }, [currentPage, filterStatus, filterPriority])

  // When tasks or search changes, filter the tasks
  useEffect(() => {
    handleFilter()
  }, [tasks, searchTerm])

  // Helper function to get auth headers for API calls
  function getHeaders () {
    const token = localStorage.getItem('token')
    return {
      headers: { Authorization: `Bearer ${token}` }
    }
  }

  // Get tasks from the server
  async function getTasks () {
    try {
      setLoading(true)

      // Build the URL with filters
      let url = `https://mb-assignment.onrender.com/api/tasks?page=${currentPage}&limit=10`
      if (filterStatus !== 'all') url += `&status=${filterStatus}`
      if (filterPriority !== 'all') url += `&priority=${filterPriority}`

      const response = await axios.get(url, getHeaders())
      setTasks(response.data.tasks)
      setTotalPages(response.data.pagination.pages)
    } catch (error) {
      console.error('Error getting tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get all users (only for admin)
  async function getUsers () {
    if (user.role === 'admin') {
      try {
        const response = await axios.get(
          'https://mb-assignment.onrender.com/api/users',
          getHeaders()
        )
        setUsers(response.data)
      } catch (error) {
        console.error('Error getting users:', error)
      }
    }
  }

  // Get task statistics
  async function getStats () {
    try {
      const response = await axios.get(
        'https://mb-assignment.onrender.com/api/tasks/stats',
        getHeaders()
      )
      setStats(response.data)
    } catch (error) {
      console.error('Error getting stats:', error)
    }
  }

  // Filter and sort tasks based on search and sort settings
  function handleFilter () {
    let filtered = tasks.filter(task => {
      return (
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })

    // Sort the filtered tasks
    filtered = filtered.sort((a, b) => {
      let valueA = a[sortBy]
      let valueB = b[sortBy]

      if (sortBy === 'dueDate') {
        valueA = new Date(valueA)
        valueB = new Date(valueB)
      } else if (sortBy === 'assignedTo') {
        valueA = a.assignedTo.username
        valueB = b.assignedTo.username
      } else if (sortBy === 'priority') {
        const priorityValues = { urgent: 4, high: 3, medium: 2, low: 1 }
        valueA = priorityValues[a.priority]
        valueB = priorityValues[b.priority]
      }

      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })

    setFilteredTasks(filtered)
  }

  // Handle sorting when user clicks column header
  function handleSort (field) {
    if (sortBy === field) {
      // If same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, start with ascending
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  // Create a new task
  async function createTask (event) {
    event.preventDefault()
    try {
      const response = await axios.post(
        'https://mb-assignment.onrender.com/api/tasks',
        formData,
        getHeaders()
      )
      setTasks([response.data.task, ...tasks])
      closeForm()
      getStats()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Update an existing task
  async function updateTask (event) {
    event.preventDefault()
    try {
      const response = await axios.put(
        `https://mb-assignment.onrender.com/api/tasks/${editingTask._id}`,
        formData,
        getHeaders()
      )

      const updatedTasks = tasks.map(task =>
        task._id === editingTask._id ? response.data.task : task
      )
      setTasks(updatedTasks)
      closeForm()
      getStats()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Delete a task
  async function deleteTask () {
    try {
      await axios.delete(
        `https://mb-assignment.onrender.com/api/tasks/${taskToDelete._id}`,
        getHeaders()
      )

      const remainingTasks = tasks.filter(task => task._id !== taskToDelete._id)
      setTasks(remainingTasks)
      setShowDeleteModal(false)
      setTaskToDelete(null)
      getStats()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Change task status
  async function changeStatus (taskId, newStatus) {
    try {
      const response = await axios.patch(
        `https://mb-assignment.onrender.com/api/tasks/${taskId}/status`,
        { status: newStatus },
        getHeaders()
      )

      const updatedTasks = tasks.map(task =>
        task._id === taskId ? response.data.task : task
      )
      setTasks(updatedTasks)
      getStats()
    } catch (error) {
      console.error('Error changing status:', error)
    }
  }

  // Change task priority
  async function changePriority (taskId, newPriority) {
    try {
      const response = await axios.patch(
        `https://mb-assignment.onrender.com/api/tasks/${taskId}/priority`,
        { priority: newPriority },
        getHeaders()
      )

      const updatedTasks = tasks.map(task =>
        task._id === taskId ? response.data.task : task
      )
      setTasks(updatedTasks)
      getStats()
    } catch (error) {
      console.error('Error changing priority:', error)
    }
  }

  // Close the task form and reset data
  function closeForm () {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: user.id
    })
    setShowTaskForm(false)
    setEditingTask(null)
  }

  // Open form to edit a task
  function openEditForm (task) {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.split('T')[0], // Format date for input
      priority: task.priority,
      assignedTo: task.assignedTo._id
    })
    setShowTaskForm(true)
  }

  // Get color for priority
  function getPriorityColor (priority) {
    if (priority === 'urgent') return '#ef4444'
    if (priority === 'high') return '#f97316'
    if (priority === 'medium') return '#f59e0b'
    if (priority === 'low') return '#10b981'
    return '#64748b'
  }

  // Get icon for status
  function getStatusIcon (status) {
    if (status === 'completed') {
      return <CheckCircle2 size={18} className='status-icon completed' />
    } else if (status === 'in-progress') {
      return <Clock size={18} className='status-icon in-progress' />
    } else {
      return <AlertCircle size={18} className='status-icon pending' />
    }
  }

  return (
    <div className='task-manager'>
      {/* Top Header */}
      <header className='header'>
        <div className='header-left'>
          <h1>Task Manager</h1>
          <p>Hi {user.username}, welcome back!</p>
        </div>
        <div className='header-right'>
          <div className='user-menu'>
            <User size={20} />
            <span>{user.username}</span>
            <button onClick={onLogout} className='logout-btn'>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className='stats-grid'>
        <div className='stat-card'>
          <div className='stat-icon total'>📋</div>
          <div className='stat-content'>
            <h3>{stats.total || 0}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className='stat-card'>
          <div className='stat-icon pending'>⏳</div>
          <div className='stat-content'>
            <h3>{stats.pending || 0}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className='stat-card'>
          <div className='stat-icon progress'>🔄</div>
          <div className='stat-content'>
            <h3>{stats.inProgress || 0}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div className='stat-card'>
          <div className='stat-icon completed'>✅</div>
          <div className='stat-content'>
            <h3>{stats.completed || 0}</h3>
            <p>Completed</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className='controls'>
        <div className='controls-left'>
          <div className='search-box'>
            <Search size={20} className='search-icon' />
            <input
              type='text'
              placeholder='Search tasks...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className='filter-group'>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className='filter-select'
            >
              <option value='all'>All Status</option>
              <option value='pending'>Pending</option>
              <option value='in-progress'>In Progress</option>
              <option value='completed'>Completed</option>
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className='filter-select'
            >
              <option value='all'>All Priority</option>
              <option value='low'>Low</option>
              <option value='medium'>Medium</option>
              <option value='high'>High</option>
              <option value='urgent'>Urgent</option>
            </select>
          </div>
        </div>

        <button onClick={() => setShowTaskForm(true)} className='add-task-btn'>
          <Plus size={20} />
          Add New Task
        </button>
      </div>

      {/* Task Table */}
      <div className='task-list-container'>
        <div className='table-wrapper'>
          <table className='task-table'>
            <thead>
              <tr>
                <th className='sortable' onClick={() => handleSort('title')}>
                  <div className='th-content'>
                    Task Title
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className='sortable' onClick={() => handleSort('priority')}>
                  <div className='th-content'>
                    Priority
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th>Status</th>
                <th
                  className='sortable'
                  onClick={() => handleSort('assignedTo')}
                >
                  <div className='th-content'>
                    Assigned To
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className='sortable' onClick={() => handleSort('dueDate')}>
                  <div className='th-content'>
                    Due Date
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr
                  key={task._id}
                  className={`task-row priority-row-${task.priority}`}
                >
                  <td className='task-info-cell'>
                    <div className='task-info'>
                      <h4 className='task-title'>{task.title}</h4>
                      <p className='task-description'>{task.description}</p>
                    </div>
                  </td>
                  <td>
                    <select
                      value={task.priority}
                      onChange={e => changePriority(task._id, e.target.value)}
                      className={`priority-select priority-${task.priority}`}
                      style={{
                        borderColor: getPriorityColor(task.priority),
                        backgroundColor: getPriorityColor(task.priority) + '15'
                      }}
                    >
                      <option value='low'>Low</option>
                      <option value='medium'>Medium</option>
                      <option value='high'>High</option>
                      <option value='urgent'>Urgent</option>
                    </select>
                  </td>
                  <td>
                    <div className='status-cell'>
                      {getStatusIcon(task.status)}
                      <select
                        value={task.status}
                        onChange={e => changeStatus(task._id, e.target.value)}
                        className='status-select'
                      >
                        <option value='pending'>Pending</option>
                        <option value='in-progress'>In Progress</option>
                        <option value='completed'>Completed</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className='assignee-cell'>
                      <User size={16} />
                      <span>{task.assignedTo.username}</span>
                    </div>
                  </td>
                  <td>
                    <div className='date-cell'>
                      <Calendar size={16} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <div className='action-buttons'>
                      <button
                        onClick={() => openEditForm(task)}
                        className='action-btn edit'
                        title='Edit Task'
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setTaskToDelete(task)
                          setShowDeleteModal(true)
                        }}
                        className='action-btn delete'
                        title='Delete Task'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTasks.length === 0 && !loading && (
            <div className='empty-state'>
              <div className='empty-icon'>📝</div>
              <h3>No tasks found</h3>
              <p>Try searching for something else or create a new task.</p>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation */}
      <div className='pagination'>
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className='pagination-btn'
        >
          <ChevronLeft size={20} />
        </button>

        <span className='pagination-info'>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='pagination-btn'
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Create/Edit Task Form */}
      {showTaskForm && (
        <div className='modal-overlay'>
          <div className='modal'>
            <div className='modal-header'>
              <h2>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={closeForm} className='close-btn'>
                ×
              </button>
            </div>

            <form
              onSubmit={editingTask ? updateTask : createTask}
              className='task-form'
            >
              <div className='form-group'>
                <label>Task Title</label>
                <input
                  type='text'
                  value={formData.title}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className='form-group'>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  required
                />
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Due Date</label>
                  <input
                    type='date'
                    value={formData.dueDate}
                    onChange={e =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className='form-group'>
                  <label>Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={e =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value='low'>Low Priority</option>
                    <option value='medium'>Medium Priority</option>
                    <option value='high'>High Priority</option>
                    <option value='urgent'>Urgent Priority</option>
                  </select>
                </div>
              </div>

              {user.role === 'admin' && users.length > 0 && (
                <div className='form-group'>
                  <label>Assign To User</label>
                  <select
                    value={formData.assignedTo}
                    onChange={e =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                  >
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className='form-actions'>
                <button
                  type='button'
                  onClick={closeForm}
                  className='btn-secondary'
                >
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className='modal-overlay'>
          <div className='modal small'>
            <div className='modal-header'>
              <h2>Delete Task</h2>
            </div>
            <div className='modal-content'>
              <p>Are you sure you want to delete "{taskToDelete?.title}"?</p>
              <p>This cannot be undone.</p>
            </div>
            <div className='form-actions'>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setTaskToDelete(null)
                }}
                className='btn-secondary'
              >
                No, Keep It
              </button>
              <button onClick={deleteTask} className='btn-danger'>
                Yes, Delete It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {loading && (
        <div className='loading-overlay'>
          <div className='loading-spinner'></div>
        </div>
      )}
    </div>
  )
}

export default TaskManager
