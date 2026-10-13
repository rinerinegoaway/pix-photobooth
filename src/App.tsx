
import { useState } from 'react'
import {
  Camera,
  Heart,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react'
import './App.css'
import Photobooth from './components/Photobooth'

function App() {
  const [boothOpen, setBoothOpen] = useState(false)
  const [showFrames, setShowFrames] = useState(false)

  const openPhotobooth = () => {
    setBoothOpen(true)
  }

  const exploreFrames = () => {
    setShowFrames(true)
    document.getElementById('frames')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <main className="pix-page">
      <nav className="navbar">
        <a className="wordmark" href="#" aria-label="PIX home">
          <span className="logo-dot">.</span> PIX
        </a>

        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#frames">Frames</a>
        </div>

        <button
          type="button"
          className="nav-button"
          onClick={openPhotobooth}
        >
          Let's take photos <ArrowRight size={16} />
        </button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={14} />
            YOUR LITTLE PHOTO STUDIO
          </div>

          <h1>
            Little moments,
            <br />
            captured <span>together.</span>
          </h1>

          <p className="hero-description">
            Your favorite person, your cutest poses, and four
            little moments you'll want to keep forever.
          </p>

          <div className="hero-actions" id="start">
            <button
              type="button"
              className="primary-button"
              onClick={openPhotobooth}
            >
              <Camera size={19} />
              START PHOTOBOOTH
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={exploreFrames}
            >
              <ImageIcon size={18} />
              Explore frames
            </button>
          </div>

          <div className="hero-note">
            <Heart size={15} fill="currentColor" />
            Made for you and your favorite human.
          </div>
        </div>

        <div
          className="hero-art"
          aria-label="Illustrated four-cut photo strip preview"
        >
          <div className="decor decor-star">✳</div>
          <div className="decor decor-heart">♡</div>
          <div className="decor decor-sparkle">✦</div>

          <div className="photo-strip">
            <div className="strip-label">our little moments ♡</div>

            <div className="photo-frame photo-one">
              <span>♡</span>
              <div className="person person-left" />
              <div className="person person-right" />
            </div>

            <div className="photo-frame photo-two">
              <span>✦</span>
              <div className="person person-left" />
              <div className="person person-right" />
            </div>

            <div className="photo-frame photo-three">
              <span>♡</span>
              <div className="person person-left" />
              <div className="person person-right" />
            </div>

            <div className="photo-frame photo-four">
              <span>☺</span>
              <div className="person person-left" />
              <div className="person person-right" />
            </div>

            <div className="strip-footer">. PIX · JUST US TWO</div>
          </div>

          <div className="floating-note">
            <Heart size={16} fill="currentColor" />
            four shots, one memory
          </div>
        </div>
      </section>

      <section className="frames-section" id="frames">
        <div className="section-heading">
          <span className="eyebrow">
            A LITTLE SOMETHING FOR YOU
          </span>

          <h2>
            What's your <span>photo mood?</span>
          </h2>

          <p>Pick a vibe for your next favorite memory.</p>
        </div>

        <div className="frame-grid">
          <button
            type="button"
            className="frame-card frame-pink"
            onClick={() => setShowFrames(true)}
          >
            <span className="frame-preview">♡</span>
            <strong>Sweetheart</strong>
            <span>Soft pink · Romantic</span>
          </button>

          <button
            type="button"
            className="frame-card frame-cream"
            onClick={() => setShowFrames(true)}
          >
            <span className="frame-preview">✳</span>
            <strong>Sunday Film</strong>
            <span>Warm cream · Vintage</span>
          </button>

          <button
            type="button"
            className="frame-card frame-lilac"
            onClick={() => setShowFrames(true)}
          >
            <span className="frame-preview">✦</span>
            <strong>Love Letter</strong>
            <span>Lavender · Dreamy</span>
          </button>
        </div>

        {showFrames && (
          <p className="selection-message" role="status">
            ♡ Your frame collection is coming together!
            Choose your frame inside the photobooth as we add
            customization features.
          </p>
        )}
      </section>

      <section className="how-section" id="how-it-works">
        <span className="eyebrow">IT'S REALLY THAT EASY</span>

        <h2>Three little steps.</h2>

        <div className="steps-grid">
          <div>
            <span>01</span>
            <h3>Pick your vibe</h3>
            <p>Choose a frame and a background you both love.</p>
          </div>

          <div>
            <span>02</span>
            <h3>Strike a pose</h3>
            <p>
              Capture four silly, sweet, or completely random
              moments.
            </p>
          </div>

          <div>
            <span>03</span>
            <h3>Keep it forever</h3>
            <p>
              Download your photo strip and save the memory.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <a className="wordmark" href="#" aria-label="PIX home">
          <span className="logo-dot">.</span> PIX
        </a>

        <p>Little moments, captured together. ♡</p>

        <span>Made with love.</span>
      </footer>

      {boothOpen && (
        <Photobooth onClose={() => setBoothOpen(false)} />
      )}
    </main>
  )
}

export default App
