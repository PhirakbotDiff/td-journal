import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuthStore } from './store/useAuthStore'
import { useTradeStore } from './store/useTradeStore'
import { useAccountStore } from './store/useAccountStore'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const TradeJournal = lazy(() => import('./pages/TradeJournal'))
const OpenPositions = lazy(() => import('./pages/OpenPositions'))
const TradeHistory = lazy(() => import('./pages/TradeHistory'))
const Analytics = lazy(() => import('./pages/Analytics'))
const RiskCalculator = lazy(() => import('./pages/RiskCalculator'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-gray-500">
      Loading...
    </div>
  )
}

function FullScreenLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-sm text-gray-500">
      Loading...
    </div>
  )
}

function FullScreenError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-950 px-4 text-center">
      <p className="max-w-sm text-sm text-loss">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 active:scale-95"
      >
        Retry
      </button>
    </div>
  )
}

export default function App() {
  const session = useAuthStore((s) => s.session)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const initialized = useAuthStore((s) => s.initialized)
  const init = useAuthStore((s) => s.init)
  const fetchTrades = useTradeStore((s) => s.fetchTrades)
  const resetTrades = useTradeStore((s) => s.reset)
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts)
  const resetAccounts = useAccountStore((s) => s.reset)
  const currentAccountId = useAccountStore((s) => s.currentAccountId)
  const accountsError = useAccountStore((s) => s.error)

  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  // Keyed on userId (not the whole session object) so a silent token refresh
  // doesn't re-trigger a full data reload and flash the loading screen.
  // Runs again whenever currentAccountId changes: once to discover it (after
  // fetchAccounts resolves) and again whenever the user switches accounts.
  useEffect(() => {
    if (!userId) {
      resetTrades()
      resetAccounts()
      setDataReady(false)
      return
    }

    if (!currentAccountId) {
      fetchAccounts()
      return
    }

    let cancelled = false
    setDataReady(false)
    fetchTrades(currentAccountId).finally(() => {
      if (!cancelled) setDataReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [userId, currentAccountId, fetchTrades, fetchAccounts, resetTrades, resetAccounts])

  if (!initialized) {
    return <FullScreenLoading />
  }

  if (!session) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    )
  }

  if (accountsError) {
    return <FullScreenError message={accountsError} onRetry={fetchAccounts} />
  }

  if (!dataReady) {
    return <FullScreenLoading />
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journal" element={<TradeJournal />} />
          <Route path="/positions" element={<OpenPositions />} />
          <Route path="/history" element={<TradeHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/risk-calculator" element={<RiskCalculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
