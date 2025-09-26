import React, { useState } from 'react'
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

const API_URL = 'https://mb-assignment.onrender.com/api'

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData

      const response = await axios.post(`${API_URL}${endpoint}`, payload)

      onLogin(response.data.user, response.data.token)
    } catch (err) {
      console.log(err)
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = e => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className='auth-container'>
      <div className='auth-background'></div>
      <div className='auth-card'>
        <div className='auth-header'>
          <h1>Task Manager</h1>
          <p>{isLogin ? 'Welcome back!' : 'Create your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className='auth-form'>
          {!isLogin && (
            <div className='input-group'>
              <User size={20} className='input-icon' />
              <input
                type='text'
                name='username'
                placeholder='Username'
                value={formData.username}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

          <div className='input-group'>
            <Mail size={20} className='input-icon' />
            <input
              type='email'
              name='email'
              placeholder='Email'
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className='input-group'>
            <Lock size={20} className='input-icon' />
            <input
              type={showPassword ? 'text' : 'password'}
              name='password'
              placeholder='Password'
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type='button'
              className='password-toggle'
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <div className='error-message'>{error}</div>}

          <button type='submit' className='auth-submit' disabled={isLoading}>
            {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className='auth-switch'>
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type='button'
              onClick={() => setIsLogin(!isLogin)}
              className='link-button'
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
