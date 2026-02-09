//frontend\src\components\LoginForm.jsx
import { useState } from 'react'
import { useAuth } from '../context/authContext.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'


import { useNavigate } from 'react-router-dom'
export default function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const loginToast = toast.loading('Authenticating...')

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        toast.success('Welcome back!', { id: loginToast })
        navigate('/dashboard') // REDIRECT HERE
      } else {
        toast.error(result.error || 'Invalid credentials', { id: loginToast })
      }
    } catch (err) {
      toast.error("Connection failed. Is the server running?", { id: loginToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Login</h1>
          <p className="text-sm text-zinc-400">Enter your credentials to access your account</p>
        </div>

        <div className="grid gap-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label className="sr-only" htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  disabled={loading}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-zinc-900/50 border-zinc-800 text-white"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="sr-only" htmlFor="password">Password</Label>
                <Input
                  id="password"
                  placeholder="Password"
                  type="password"
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-zinc-900/50 border-zinc-800 text-white"
                  required
                />
              </div>
              <Button disabled={loading} className="w-full bg-white text-black hover:bg-zinc-200">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" type="button" disabled={loading} className="border-zinc-800 text-white hover:bg-zinc-900">
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>

        <p className="px-8 text-center text-sm text-zinc-500">
          By clicking continue, you agree to our{" "}
          <a href="#" className="underline underline-offset-4 hover:text-zinc-300">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4 hover:text-zinc-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}