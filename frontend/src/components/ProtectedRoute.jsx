import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/authContext.jsx'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { state } = useAuth()

  // 1. If we have a token but no user yet, we are likely re-fetching 'me'
  if (state.token && !state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  // 2. If not authenticated, redirect to login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 3. Otherwise, render the dashboard content
  return children
}