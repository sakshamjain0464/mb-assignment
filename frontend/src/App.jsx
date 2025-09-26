import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  User,
  LogOut,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import TaskManager from './components/TaskManager'
import AuthForm from './components/AuthForm'
import './App.css'

function App () {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className='loading-container'>
        <div className='loading-spinner'></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className='app'>
      {user ? (
        <TaskManager user={user} onLogout={handleLogout} />
      ) : (
        <AuthForm onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App
