import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/authContext.jsx'  // lowercase
import { Toaster } from 'react-hot-toast'  // ✅ Fixed: use react-hot-toast
  
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster 
    position="top-center"
    toastOptions={{
      style: {
        background: '#18181b', // Zinc-900
        color: '#fff',
        border: '1px solid #27272a', // Zinc-800
      },
    }}
  />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
