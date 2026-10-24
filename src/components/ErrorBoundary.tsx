import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md surface p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-loss/10">
            <AlertTriangle className="h-6 w-6 text-loss" />
          </div>
          <h1 className="text-lg font-semibold text-gray-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <p className="mt-3 rounded-lg bg-gray-950 px-3 py-2 font-mono text-xs text-gray-500">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-emerald-500 active:scale-95"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
