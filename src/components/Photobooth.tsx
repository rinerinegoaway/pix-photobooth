
import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, X, Download } from 'lucide-react'

type PhotoboothProps = {
  onClose: () => void
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

  useEffect(() => {
    let active = true

    async function startCamera() {
      try {
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
          setCameraReady(true)
        }
      } catch {
        setCameraError(
          'Camera access was unavailable. Allow camera permission in your browser and try again.',
        )
      }
    }

    void startCamera()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  async function captureShot() {
    if (!videoRef.current || busy || shots.length >= 4) return

    setBusy(true)

    for (let number = 3; number >= 1; number--) {
      setCountdown(number)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setCountdown(null)

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.videoWidth === 0) {
      setBusy(false)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setBusy(false)
      return
    }

    // Mirror the captured selfie to match the preview.
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const image = canvas.toDataURL('image/jpeg', 0.92)

    setShots(previous => [...previous, image])
    setBusy(false)
  }

  function retakeShot(index: number) {
    setShots(previous => previous.filter((_, i) => i !== index))
  }

  function downloadStrip() {
    if (shots.length !== 4 || !canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    const width = 600
    const photoHeight = 400
    const padding = 24
    const gap = 12

    canvas.width = width
    canvas.height = padding * 2 + photoHeight * 4 + gap * 3 + 70

    context.fillStyle = '#fffaf7'
    context.fillRect(0, 0, canvas.width, canvas.height)

    shots.forEach((image, index) => {
      const photo = new Image()

      photo.onload = () => {
        const y = padding + index * (photoHeight + gap)
        const ratio = Math.max(width - padding * 2 / photo.width, photoHeight / photo.height)
        const scale = Math.max((width - padding * 2) / photo.width, photoHeight / photo.height)
        const cropWidth = (width - padding * 2) / scale
        const cropHeight = photoHeight / scale

        context.drawImage(
          photo,
          (photo.width - cropWidth) / 2,
          (photo.height - cropHeight) / 2,
          cropWidth,
          cropHeight,
          padding,
          y,
          width - padding * 2,
          photoHeight,
        )

        if (index === 3) {
          context.fillStyle = '#b66e85'
          context.font = '20px sans-serif'
          context.textAlign = 'center'
          context.fillText('. PIX  ♥  JUST US TWO', width / 2, canvas.height - 18)

          canvas.toBlob(blob => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'pix-couple-photostrip.png'
            link.click()
            URL.revokeObjectURL(url)
          }, 'image/png')
        }
      }

      photo.src = image
    })
  }

  return (
    <div className="booth-overlay">
      <section className="booth-panel">
        <header className="booth-header">
          <div>
            <span className="booth-brand">. PIX</span>
            <p>Little moments, captured together.</p>
          </div>
          <button className="booth-close" onClick={onClose} aria-label="Close photobooth">
            <X />
          </button>
        </header>

        {cameraError ? (
          <div className="camera-message">
            <Camera size={36} />
            <h2>We couldn't open your camera</h2>
            <p>{cameraError}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Try again
            </button>
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
              {!cameraReady && <p className="camera-loading">Opening your camera...</p>}
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
                className="primary-button"
                onClick={() => void captureShot()}
                disabled={!cameraReady || busy || shots.length >= 4}
              >
                <Camera size={18} />
                {busy ? 'GET READY...' : shots.length === 4 ? 'ALL PHOTOS TAKEN' : 'TAKE PHOTO'}
              </button>
              <button
                className="secondary-button"
                onClick={() => setShots([])}
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
                      <img src={shots[index]} alt={`Captured photo ${index + 1}`} />
                      <button
                        onClick={() => retakeShot(index)}
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

            {shots.length === 4 && (
              <button className="primary-button download-button" onClick={downloadStrip}>
                <Download size={18} /> DOWNLOAD PHOTO STRIP
              </button>
            )}
          </>
        )}

        <canvas ref={canvasRef} hidden />
      </section>
    </div>
  )
}
