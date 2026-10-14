// A tiny synthesized camera shutter, so no audio file is needed. Browsers only allow sound after
// a user gesture, so call primeShutter() from the button that starts a session.

let context: AudioContext | null = null

export function primeShutter() {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
  } catch {
    /* sound is optional */
  }
}

export function playShutter() {
  try {
    if (!context) return
    const length = Math.floor(context.sampleRate * 0.14)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      // Two quick clicks (open, close) made from decaying noise.
      const t = i / context.sampleRate
      const click = (offset: number) => (t >= offset ? Math.exp(-(t - offset) * 90) : 0)
      data[i] = (Math.random() * 2 - 1) * (click(0) + 0.7 * click(0.07))
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2200
    const gain = context.createGain()
    gain.gain.value = 0.5
    source.connect(filter).connect(gain).connect(context.destination)
    source.start()
  } catch {
    /* sound is optional */
  }
}
