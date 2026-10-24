import { FormEvent, useState } from 'react'
import { LineChart, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const errorMessage = await signIn(email, password)
    setLoading(false)
    if (errorMessage) {
      setError(errorMessage)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-gray-100 outline-none transition-colors focus:border-emerald-500'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-400'
  const iconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-sky-500/10 blur-[100px]" />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20">
            <LineChart className="h-6 w-6 text-emerald-400" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-100">Trade Journal</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to track your edge.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-gray-900/90 to-gray-900/70 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_24px_48px_-16px_rgba(0,0,0,0.7)] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail className={iconClass} />
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <Lock className={iconClass} />
                <input
                  className={`${inputClass} pr-9`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-loss/20 bg-loss/10 px-3 py-2 text-xs text-loss">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-transform hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">Private journal · your data, your trades.</p>
      </div>
    </div>
  )
}
