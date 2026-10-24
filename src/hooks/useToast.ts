import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastState {
  message: string
  isError: boolean
}

export function useToast(durationMs = 2500) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(
    (message: string, isError = false) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast({ message, isError })
      timerRef.current = setTimeout(() => setToast(null), durationMs)
    },
    [durationMs],
  )

  const showResult = useCallback(
    (errorMessage: string | null, successMessage: string) => {
      show(errorMessage ?? successMessage, Boolean(errorMessage))
    },
    [show],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { toast, show, showResult }
}
