import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../context/authContext.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState = {
  companyName: '',
  emailDomain: '',
  industry: '',
  services: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
}

export default function AdminRegistrationForm() {
  const [formData, setFormData] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const { axios, state } = useAuth()
  const navigate = useNavigate()

  const onChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const normalizeDomain = (domain) => domain.trim().toLowerCase().replace(/^@/, '')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (state.isAuthenticated) {
      navigate('/dashboard')
      return
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const emailDomain = normalizeDomain(formData.emailDomain)
    if (!emailDomain.includes('.')) {
      toast.error('Please enter a valid company email domain (example.com)')
      return
    }

    const payload = {
      companyName: formData.companyName.trim(),
      emailDomain,
      industry: formData.industry.trim(),
      services: formData.services
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean),
      adminName: formData.adminName.trim(),
      adminEmail: formData.adminEmail.trim().toLowerCase(),
      adminPassword: formData.adminPassword,
    }

    setLoading(true)
    const requestToast = toast.loading('Creating admin account...')

    try {
      const response = await axios.post('/auth/register-company-admin', payload)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      toast.success('Admin account created', { id: requestToast })
      window.location.href = '/dashboard'
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed', { id: requestToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
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
              Build your company workspace in minutes
            </h2>
            <p className="mt-4 max-w-md text-sm text-zinc-300">
              Create your company profile, set your admin account, and start managing tenders with your team.
            </p>
          </div>

          <div className="relative space-y-3 text-sm text-zinc-300">
            <p>One company domain per workspace</p>
            <p>Secure admin onboarding</p>
            <p>Team and tender setup after first login</p>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                <div className="h-4 w-4 rotate-45 bg-background" />
              </div>
              <span className="text-2xl font-bold tracking-tight">TenderFlow</span>
            </div>
            <h1 className="text-2xl font-semibold">Admin Registration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Register your company and create the first company admin account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => onChange('companyName', e.target.value)}
                  placeholder="Acme Pvt Ltd"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emailDomain">Company Email Domain</Label>
                <Input
                  id="emailDomain"
                  value={formData.emailDomain}
                  onChange={(e) => onChange('emailDomain', e.target.value)}
                  placeholder="acme.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="industry">Industry (optional)</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => onChange('industry', e.target.value)}
                  placeholder="Construction"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="services">Services (optional)</Label>
                <Input
                  id="services"
                  value={formData.services}
                  onChange={(e) => onChange('services', e.target.value)}
                  placeholder="Civil works, Material supply"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => onChange('adminName', e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => onChange('adminEmail', e.target.value)}
                  placeholder="admin@acme.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => onChange('adminPassword', e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => onChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Company Admin'
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="underline underline-offset-4 hover:text-foreground" to="/login">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
