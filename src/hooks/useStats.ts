import { useEffect, useState } from 'react'
import { fetchStats } from '../lib/community'
import type { Stats } from '../lib/community'

export type StatsState = { status: 'loading' } | { status: 'ready'; stats: Stats } | { status: 'unavailable' }

/** Loads real numbers from the server and refreshes while the tab is visible. Never invents data. */
export function useStats(refreshMs = 30_000): StatsState {
  const [state, setState] = useState<StatsState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    const load = () => {
      fetchStats(controller.signal)
        .then(stats => setState({ status: 'ready', stats }))
        .catch(error => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) setState({ status: 'unavailable' })
        })
    }
    load()
    // Refresh periodically, but only spend requests while the tab is actually being looked at.
    const id = window.setInterval(() => {
      if (!document.hidden) load()
    }, refreshMs)
    const onVisible = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      controller.abort()
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshMs])
  return state
}
