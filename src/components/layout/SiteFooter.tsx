import { routes } from '../../hooks/useRoute'
import { goToSection } from '../../lib/nav'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="container-x flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-end gap-2">
            <Logo signature={false} className="h-8 w-auto shrink-0" />
            <span className="t-hand pb-0.5 text-lg leading-none text-soft">by Rine</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">A free photobooth that runs in your browser. No account, no watermark on your photos.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted">
          <a href={routes.solo} className="hover:text-ink">
            Solo booth
          </a>
          <a href={routes.together} className="hover:text-ink">
            Together booth
          </a>
          <a href={routes.distance} className="hover:text-ink">
            Long-distance booth
          </a>
          <a
            href="#privacy"
            className="hover:text-ink"
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
