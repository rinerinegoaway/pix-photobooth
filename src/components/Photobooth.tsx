
import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  RotateCcw,
  X,
  Download,
  Check,
  Heart,
  Sparkles,
} from 'lucide-react'

type PhotoboothProps = {
  onClose: () => void
}

type FrameId = 'sweetheart' | 'sunday' | 'love-letter'
type BackgroundId = 'blush' | 'cream' | 'lavender' | 'sage'

const frames: {
  id: FrameId
  name: string
  description: string
  color: string
}[] = [
  {
    id: 'sweetheart',
    name: 'Sweetheart',
    description: 'Romantic pink',
    color: '#f3d8df',
  },
  {
    id: 'sunday',
    name: 'Sunday Film',
    description: 'Warm vintage',
    color: '#e9ddc8',
  },
  {
    id: 'love-letter',
    name: 'Love Letter',
    description: 'Dreamy lilac',
    color: '#e4d9ef',
  },
]

const backgrounds: {
  id: BackgroundId
  name: string
  color: string
}[] = [
  { id: 'blush', name: 'Blush Pink', color: '#f6e0e4' },
  { id: 'cream', name: 'Vanilla Cream', color: '#fff8e9' },
  { id: 'lavender', name: 'Lavender', color: '#eee6f7' },
  { id: 'sage', name: 'Soft Sage', color: '#e3eadf' },
]

const frameDetails: Record<
  FrameId,
  {
    paper: string
    ink: string
    accent: string
    footer: string
  }
> = {
  sweetheart: {
    paper: '#fff9fa',
    ink: '#a85570',
    accent: '#d987a0',
    footer: 'MADE WITH LOVE',
  },
  sunday: {
    paper: '#f8f0df',
    ink: '#745742',
    accent: '#b18b65',
    footer: 'SUNDAY MEMORIES',
  },
  'love-letter': {
    paper: '#faf6ff',
    ink: '#80629c',
    accent: '#b39acb',
    footer: 'A LITTLE LOVE NOTE',
  },
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  )

  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load a photo.'))

    image.src = src
  })
}

function drawHeart(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  context.save()
  context.translate(x, y)
  context.scale(size / 24, size / 24)
  context.beginPath()
  context.moveTo(12, 21)
  context.bezierCurveTo(10, 19, 1, 13, 1, 7)
  context.bezierCurveTo(1, 1, 9, 0, 12, 6)
  context.bezierCurveTo(15, 0, 23, 1, 23, 7)
  context.bezierCurveTo(23, 13, 14, 19, 12, 21)
  context.fill()
  context.restore()
}

export default function Photobooth({ onClose }: PhotoboothProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shots, setShots] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const [selectedFrame, setSelectedFrame] =
    useState<FrameId>('sweetheart')
  const [selectedBackground, setSelectedBackground] =
    useState<BackgroundId>('blush')

  const [caption, setCaption] = useState('our little moments')
  const [coupleNames, setCoupleNames] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [exportError, setExportError] = useState('')

  const frame = frameDetails[selectedFrame]
  const background = backgrounds.find(
    item => item.id === selectedBackground,
  )!

  useEffect(() => {
    let active = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser does not support camera access.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (!active) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()

          if (active) setCameraReady(true)
        }
      } catch (error) {
        if (active) {
          setCameraError(
            error instanceof Error
              ? error.message
              : 'Camera access was unavailable. Check your browser permissions.',
          )
        }
      }
    }

    void startCamera()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!shots.length) {
      setPreviewUrl('')
      return
    }

    let cancelled = false

    async function updatePreview() {
      try {
        const blob = await renderStrip(shots)
        const url = URL.createObjectURL(blob)

        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }

        setPreviewUrl(previous => {
          if (previous) URL.revokeObjectURL(previous)
          return url
        })
      } catch {
        if (!cancelled) setExportError('Could not generate the preview.')
      }
    }

    void updatePreview()

    return () => {
      cancelled = true
    }
    // Rendering depends on the selected design and captured photos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots, selectedFrame, selectedBackground, caption, coupleNames])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function captureShot() {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      busy ||
      shots.length >= 4
    ) {
      return
    }

    setBusy(true)
    setExportError('')

    try {
      for (let number = 3; number >= 1; number--) {
        setCountdown(number)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setCountdown(null)

      const video = videoRef.current
      const canvas = canvasRef.current

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('The camera is not ready yet. Try again.')
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not capture this photo.')

      context.save()
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      context.restore()

      const image = canvas.toDataURL('image/jpeg', 0.92)

      setShots(previous => [...previous, image])
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Could not capture the photo.',
      )
    } finally {
      setCountdown(null)
      setBusy(false)
    }
  }

  function retakeShot(index: number) {
    setShots(previous => previous.filter((_, i) => i !== index))
  }

  async function renderStrip(photos: string[]): Promise<Blob> {
    if (photos.length !== 4) {
      throw new Error('Capture all four photos before exporting.')
    }

    const canvas = canvasRef.current
    if (!canvas) throw new Error('Canvas is unavailable.')

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas rendering is unavailable.')

    const images = await Promise.all(photos.map(loadImage))

    const width = 720
    const padding = 32
    const photoHeight = 410
    const gap = 14
    const headerHeight = 76
    const footerHeight = 94
    const photoWidth = width - padding * 2

    canvas.width = width
    canvas.height =
      padding + headerHeight + photoHeight * 4 + gap * 3 + footerHeight

    // Background fills the entire exported canvas.
    context.fillStyle = background.color
    context.fillRect(0, 0, width, canvas.height)

    // Paper/frame color sits inside the background.
    context.fillStyle = frame.paper
    context.fillRect(14, 14, width - 28, canvas.height - 28)

    // Decorative corner marks depend on the selected frame.
    context.fillStyle = frame.accent
    drawHeart(context, 34, 38, 22)
    drawHeart(context, width - 56, 38, 22)

    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = frame.ink
    context.font = '600 20px sans-serif'
    context.fillText(
      (caption.trim() || 'our little moments').slice(0, 40),
      width / 2,
      padding + 20,
      width - 120,
    )

    if (coupleNames.trim()) {
      context.font = '16px sans-serif'
      context.fillText(
        coupleNames.trim().slice(0, 50),
        width / 2,
        padding + 49,
        width - 100,
      )
    }

    images.forEach((image, index) => {
      const x = padding
      const y = padding + headerHeight + index * (photoHeight + gap)

      context.save()

      // A subtle shadow separates the photo from the frame.
      context.shadowColor = '#35262b18'
      context.shadowBlur = 8
      context.shadowOffsetY = 2
      context.fillStyle = '#ffffff'
      context.fillRect(x - 2, y - 2, photoWidth + 4, photoHeight + 4)

      context.restore()

      context.save()
      context.beginPath()
      context.rect(x, y, photoWidth, photoHeight)
      context.clip()

      drawCover(context, image, x, y, photoWidth, photoHeight)

      context.restore()

      // Frame-specific decorative marks on each photograph.
      context.fillStyle = frame.accent
      if (selectedFrame === 'sweetheart') {
        drawHeart(context, x + 16, y + 16, 24)
      } else if (selectedFrame === 'sunday') {
        context.fillRect(x + 12, y + 12, 34, 3)
      } else {
        context.font = '26px sans-serif'
        context.fillText('✦', x + photoWidth - 24, y + 22)
      }
    })

    const footerY = canvas.height - 42

    context.fillStyle = frame.ink
    context.font = '600 16px sans-serif'
    context.fillText(frame.footer, width / 2, footerY - 10)

    context.font = '14px sans-serif'
    context.fillText('. PIX  ♥  JUST US TWO', width / 2, footerY + 14)

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Could not export the photo strip.'))
      }, 'image/png')
    })
  }

  async function downloadStrip() {
    try {
      setExportError('')
      const blob = await renderStrip(shots)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'pix-couple-photostrip.png'
      link.click()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Download failed.',
      )
    }
  }

  return (
    <div className="booth-overlay">
      <section className="booth-panel">
        <header className="booth-header">
          <div>
            <span className="booth-brand">. PIX</span>
            <p>Little moments, captured together.</p>
          </div>

          <button
            type="button"
            className="booth-close"
            onClick={onClose}
            aria-label="Close photobooth"
          >
            <X />
          </button>
        </header>

        <div className="booth-layout">
          <div className="booth-main">
            {cameraError ? (
              <div className="camera-message">
                <Camera size={36} />
                <h2>We couldn't open your camera</h2>
                <p>{cameraError}</p>
                <p>Check your browser's camera permissions, then reopen the studio.</p>
              </div>
            ) : (
              <>
                <div className="camera-preview">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {!cameraReady && (
                    <p className="camera-loading">Opening your camera...</p>
                  )}

                  {cameraReady && (
                    <div className="position-guide">
                      <span>Stand close together ♡</span>
                    </div>
                  )}

                  {countdown !== null && (
                    <div className="countdown-overlay">{countdown}</div>
                  )}
                </div>

                <div className="booth-controls">
                  <span>PHOTO {Math.min(shots.length + 1, 4)} OF 4</span>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void captureShot()}
                    disabled={!cameraReady || busy || shots.length >= 4}
                  >
                    <Camera size={18} />
                    {busy
                      ? 'GET READY...'
                      : shots.length === 4
                        ? 'ALL PHOTOS TAKEN'
                        : 'TAKE PHOTO'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setShots([])
                      setExportError('')
                    }}
                    disabled={busy || shots.length === 0}
                  >
                    <RotateCcw size={16} /> Restart
                  </button>
                </div>

                <div className="shot-grid">
                  {[0, 1, 2, 3].map(index => (
                    <div className="shot-thumbnail" key={index}>
                      {shots[index] ? (
                        <>
                          <img
                            src={shots[index]}
                            alt={`Captured photo ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => retakeShot(index)}
                            disabled={busy}
                            aria-label={`Retake photo ${index + 1}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        </>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="booth-customizer">
            <div className="customizer-heading">
              <Sparkles size={17} />
              <h3>Your photo style</h3>
            </div>

            <label className="customizer-label">PHOTO FRAME</label>

            <div className="frame-options">
              {frames.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={`frame-option ${
                    selectedFrame === item.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedFrame(item.id)}
                >
                  <span
                    className="frame-option-swatch"
                    style={{ backgroundColor: item.color }}
                  >
                    <Heart size={17} />
                  </span>

                  <span className="frame-option-text">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>

                  {selectedFrame === item.id && (
                    <Check size={17} className="option-check" />
                  )}
                </button>
              ))}
            </div>

            <label className="customizer-label">STRIP BACKGROUND</label>

            <div className="background-options">
              {backgrounds.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={`background-option ${
                    selectedBackground === item.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedBackground(item.id)}
                  aria-label={`Select ${item.name} background`}
                  aria-pressed={selectedBackground === item.id}
                >
                  <span style={{ backgroundColor: item.color }} />
                  <small>{item.name}</small>
                  {selectedBackground === item.id && <Check size={13} />}
                </button>
              ))}
            </div>

            <label className="customizer-label" htmlFor="pix-caption">
              STRIP CAPTION
            </label>
            <input
              id="pix-caption"
              className="customizer-input"
              value={caption}
              onChange={event => setCaption(event.target.value)}
              maxLength={40}
              placeholder="our little moments"
            />

            <label className="customizer-label" htmlFor="pix-names">
              COUPLE NAMES <span>(OPTIONAL)</span>
            </label>
            <input
              id="pix-names"
              className="customizer-input"
              value={coupleNames}
              onChange={event => setCoupleNames(event.target.value)}
              maxLength={50}
              placeholder="e.g. Alex & Jamie"
            />

            <div className="strip-preview-heading">
              <span>STRIP PREVIEW</span>
              {shots.length === 4 && <span>4 PHOTOS</span>}
            </div>

            {previewUrl ? (
              <img
                className="generated-strip-preview"
                src={previewUrl}
                alt="Preview of your customized four-photo strip"
              />
            ) : (
              <div
                className="empty-strip-preview"
                style={{
                  backgroundColor: background.color,
                  borderColor: frame.accent,
                }}
              >
                <Heart size={23} color={frame.ink} />
                <span>Your memories will appear here</span>
                <small>{shots.length} of 4 photos captured</small>
              </div>
            )}

            {shots.length === 4 && (
              <button
                type="button"
                className="primary-button download-button"
                onClick={() => void downloadStrip()}
              >
                <Download size={17} /> DOWNLOAD PNG
              </button>
            )}

            {exportError && (
              <p className="export-error" role="alert">
                {exportError}
              </p>
            )}
          </aside>
        </div>

        <canvas ref={canvasRef} hidden />
      </section>
    </div>
  )
}
