import { useEffect } from 'react'
import { useRoute } from './hooks/useRoute'
import { BoothModeSelector } from './components/landing/BoothModeSelector'
import { HeroSection } from './components/landing/HeroSection'
import { BoothExperience, Faq, HowItWorks, MadeForDistance, MakeItYours, PrivacySection } from './components/landing/Sections'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { Booth } from './components/photobooth/Booth'
import { SharedBooth } from './components/shared/SharedBooth'

function App() {
  const route = useRoute()

  useEffect(() => {
    if (route.name !== 'home') window.scrollTo({ top: 0 })
  }, [route.name])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-paper focus:p-2">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {route.name === 'home' && (
          <>
            <HeroSection />
            <BoothModeSelector />
            <HowItWorks />
            <BoothExperience />
            <MadeForDistance />
            <MakeItYours />
            <PrivacySection />
            <Faq />
          </>
        )}
        {route.name === 'booth' && (
          <div className="container-x py-8 sm:py-10">
            {/* key resets all booth state (and stops the camera) when switching modes */}
            <Booth key={route.mode} mode={route.mode} />
          </div>
        )}
        {route.name === 'distance' && (
          <div className="container-x py-8 sm:py-10">
            <SharedBooth key={route.join ?? 'new'} joinCode={route.join} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
