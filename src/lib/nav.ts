/** Scrolls to a landing-page section, returning to the landing page first when needed. */
export function goToSection(id: string) {
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const onHome = !window.location.hash || window.location.hash === '#/' || window.location.hash === '#'
  if (onHome) {
    scroll()
    return
  }
  window.location.hash = '#/'
  window.setTimeout(scroll, 60)
}

const AUTOSTART_KEY = 'pix.autostart'

/**
 * "Enter photobooth" buttons call this: the click is the user's request to turn the camera on
 * as soon as the booth opens. Opening a booth URL directly never starts the camera by itself.
 */
export function requestAutoStart() {
  try {
    window.sessionStorage.setItem(AUTOSTART_KEY, String(Date.now()))
  } catch {
    /* without storage the booth just asks for one more click */
  }
}

/** True once per recent "Enter" click. Expires quickly so a later reload doesn't re-trigger it. */
export function consumeAutoStart(): boolean {
  try {
    const stamp = Number(window.sessionStorage.getItem(AUTOSTART_KEY))
    if (!stamp) return false
    // React StrictMode runs effects twice in development, so expire by time instead of removing at once.
    window.setTimeout(() => window.sessionStorage.removeItem(AUTOSTART_KEY), 1500)
    return Date.now() - stamp < 5000
  } catch {
    return false
  }
}
