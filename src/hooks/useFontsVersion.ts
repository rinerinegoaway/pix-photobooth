import { useEffect, useState } from 'react'

/** Bumps whenever a web font finishes loading so canvases can redraw with the real glyphs. */
export function useFontsVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!('fonts' in document)) return
    const bump = () => setVersion(value => value + 1)
    document.fonts.addEventListener('loadingdone', bump)
    return () => document.fonts.removeEventListener('loadingdone', bump)
  }, [])
  return version
}
