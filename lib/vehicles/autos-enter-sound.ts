let autosEnterSoundPlayed = false

/** Breve sonido tipo motor al entrar al vertical Autos (Web Audio; sin archivo externo). */
export function playAutosEnterSound(): boolean {
  if (typeof window === "undefined") return false
  if (autosEnterSoundPlayed) return false
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const run = () => {
      if (autosEnterSoundPlayed) {
        void ctx.close()
        return
      }
      autosEnterSoundPlayed = true

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, ctx.currentTime)
      master.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.08)
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65)
      master.connect(ctx.destination)

      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(72, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(118, ctx.currentTime + 0.18)
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.55)

      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.35
      osc.connect(oscGain)
      oscGain.connect(master)

      const bufferSize = ctx.sampleRate * 0.4
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4
      }
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = "lowpass"
      noiseFilter.frequency.value = 280
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.25
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)

      const start = ctx.currentTime
      osc.start(start)
      noise.start(start)
      osc.stop(start + 0.7)
      noise.stop(start + 0.45)

      window.setTimeout(() => {
        void ctx.close()
      }, 900)
    }

    if (ctx.state === "suspended") {
      void ctx.resume().then(run).catch(() => {
        void ctx.close()
      })
      return false
    }

    run()
    return true
  } catch {
    return false
  }
}
