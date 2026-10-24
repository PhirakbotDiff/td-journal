import { Check, X } from 'lucide-react'
import clsx from 'clsx'
import { ToastState } from '../hooks/useToast'

interface ToastProps {
  toast: ToastState | null
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null

  return (
    <div
      className={clsx(
        'mb-4 flex animate-slide-down items-center gap-2 rounded-lg border px-4 py-2 text-sm',
        toast.isError
          ? 'border-red-900 bg-loss/10 text-loss'
          : 'border-emerald-900 bg-emerald-500/10 text-emerald-400',
      )}
    >
      {toast.isError ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      {toast.message}
    </div>
  )
}
