import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'booth'; mode: 'solo' | 'together' }
  | { name: 'distance'; join: string | null }

// The room code lives in the URL fragment (after #). Browsers never send fragments to servers,
// so the invite code does not appear in server logs, referrers or analytics.
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const [first, second] = path.split('/')
  if (first === 'booth' && (second === 'solo' || second === 'together')) return { name: 'booth', mode: second }
  if (first === 'distance') return { name: 'distance', join: null }
  if (first === 'join' && second) return { name: 'distance', join: second.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }
  return { name: 'home' }
}

export const routes = {
  home: '#/',
  solo: '#/booth/solo',
  together: '#/booth/together',
  distance: '#/distance',
}

export function inviteLink(room: string): string {
  return `${window.location.origin}${window.location.pathname}#/join/${room}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
