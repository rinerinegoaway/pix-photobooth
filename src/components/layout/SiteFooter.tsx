import { routes } from '../../hooks/useRoute'
import { goToSection } from '../../lib/nav'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-blush/60">
      <div className="container-x flex flex-col items-start justify-between gap-8 py-10 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-end gap-2">
            <Logo signature={false} className="h-9 w-auto shrink-0" />
            <span className="t-hand pb-0.5 text-xl leading-none text-muted">by Rine</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">A free photobooth that runs in your browser. No account, no watermark on your photos.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <a href={routes.solo} className="hover:underline hover:underline-offset-4">
            Solo booth
          </a>
          <a href={routes.together} className="hover:underline hover:underline-offset-4">
            Together booth
          </a>
          <a href={routes.distance} className="hover:underline hover:underline-offset-4">
            Long-distance booth
          </a>
          <a
            href="#privacy"
            className="hover:underline hover:underline-offset-4"
            onClick={event => {
              event.preventDefault()
              goToSection('privacy')
            }}
          >
            Privacy
          </a>
        </nav>
      </div>
    </footer>
  )
}
