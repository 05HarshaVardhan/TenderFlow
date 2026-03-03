//frontend\src\components\LoginForm.jsx
import { useState } from 'react'
import { useAuth } from '../context/authContext.jsx'
import { useTheme } from '../context/useTheme.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'


import { Link, useNavigate } from 'react-router-dom'
export default function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
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
    } catch {
      toast.error("Connection failed. Is the server running?", { id: loginToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 text-foreground lg:p-8">
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 border-border bg-card text-foreground hover:bg-accent"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg lg:grid-cols-2">
        <section className="relative hidden lg:flex flex-col justify-between border-r border-border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-10 text-zinc-100">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_44%)]" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100/95">
                <div className="h-4 w-4 rotate-45 bg-zinc-900" />
              </div>
              <span className="text-2xl font-bold tracking-tight">TenderFlow</span>
            </div>
            <h2 className="text-3xl font-semibold leading-tight">
              Welcome back to your control center
            </h2>
            <p className="mt-4 max-w-md text-sm text-zinc-300">
              Continue where you left off with live updates, active tenders, and team workflows in one place.
            </p>
          </div>
          <div className="relative space-y-3 text-sm text-zinc-300">
            <p>Resume active bids instantly</p>
            <p>Monitor team performance at a glance</p>
            <p>Stay aligned with tender deadlines</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                <div className="h-4 w-4 rotate-45 bg-background" />
              </div>
              <span className="text-2xl font-bold tracking-tight">TenderFlow</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

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
                    className="border-border bg-card text-foreground"
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
                    className="border-border bg-card text-foreground"
                    required
                  />
                </div>
                <Button disabled={loading} className="w-full">
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</a>.
          </p>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            New company?{" "}
            <Link to="/register-admin" className="underline underline-offset-4 hover:text-foreground">
              Register company admin
            </Link>
          </p>
          </div>
        </section>
      </div>
    </div>
  )
}
