import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function Layout() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const online = useOnlineStatus()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gray-950" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_0%,black,transparent)]" />
      </div>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        {!online && (
          <div className="flex animate-slide-down items-center justify-center gap-2 border-b border-amber-900 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            You're offline — changes won't be saved until you reconnect.
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="mx-auto max-w-7xl animate-fade-in-up px-4 py-5 sm:px-6 sm:py-8 md:px-8"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
