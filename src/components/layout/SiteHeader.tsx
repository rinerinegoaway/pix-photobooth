import { useEffect, useState } from 'react'
import { routes } from '../../hooks/useRoute'
import { goToSection } from '../../lib/nav'
import { Logo } from './Logo'

const links = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'privacy', label: 'Privacy' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault()
    setOpen(false)
    goToSection(id)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="container-x flex h-[4.25rem] items-center justify-between gap-4">
        <a href={routes.home} className="flex shrink-0 items-end gap-2" aria-label=". PIX by Rine, home" onClick={() => setOpen(false)}>
          <Logo signature={false} className="h-9 w-auto shrink-0 sm:h-10" />
          <span className="t-hand pb-0.5 text-xl leading-none text-muted">by Rine</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map(link => (
            <a key={link.id} href={`#${link.id}`} onClick={go(link.id)} className="text-sm font-bold text-ink/80 transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
          <a href="#booths" onClick={go('booths')} className="btn btn-primary btn-sm">
            Start a booth
          </a>
        </nav>

        <button
          type="button"
          className="btn btn-secondary btn-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(value => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-paper md:hidden">
          <ul className="container-x m-0 flex list-none flex-col gap-1 py-3">
            {links.map(link => (
              <li key={link.id}>
                <a href={`#${link.id}`} onClick={go(link.id)} className="block rounded-xl px-2 py-3 text-base font-bold">
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <a href="#booths" onClick={go('booths')} className="btn btn-primary w-full">
                Start a booth
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
