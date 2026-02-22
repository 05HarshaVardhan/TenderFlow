// frontend/src/context/authContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

const axiosInstance = axios.create({
  baseURL: API_BASE,
})

// Interceptor to attach Token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor to handle Session Expiry
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const AuthContext = createContext()

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_INIT':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!action.payload.user,
        loading: false // Auth check finished
      }
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
      return { 
        ...state, 
        user: action.payload.user, 
        token: action.payload.token, 
        isAuthenticated: true,
        loading: false
      }
    case 'LOGOUT':
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return { 
        ...state, 
        user: null, 
        token: null, 
        isAuthenticated: false,
        loading: false
      }
    case 'STOP_LOADING':
      return { ...state, loading: false }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, { 
    user: null, 
    token: null, 
    isAuthenticated: false,
    loading: true // Start in loading state
  })

  // Handle Initial Load / Page Refresh
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (token && storedUser) {
        try {
          // Set the token in the axios instance
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Verify with backend to get fresh user data on refresh
          const response = await axiosInstance.get('/auth/me')
          
          // If we get here, the token is valid
          dispatch({ 
            type: 'AUTH_INIT', 
            payload: { 
              user: response.data, 
              token 
            } 
          })
        } catch (error) {
          console.error("Auth check failed:", error.response?.data?.message || error.message)
          // Clear invalid token and user data
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          delete axiosInstance.defaults.headers.common['Authorization']
          dispatch({ type: 'STOP_LOADING' })
        }
      } else {
        dispatch({ type: 'STOP_LOADING' })
      }
    }
    
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password })
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.data })
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const logout = () => dispatch({ type: 'LOGOUT' })

  return (
    <AuthContext.Provider value={{ state, login, logout, axios: axiosInstance }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}