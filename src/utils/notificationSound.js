let audioCtx = null

export function playMessageBeep() {
  if (document.hidden || isMuted()) return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    const t = audioCtx.currentTime
    const blip = (freq, start, gainVal) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t + start)
      gain.gain.exponentialRampToValueAtTime(gainVal, t + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + start + 0.18)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(t + start)
      osc.stop(t + start + 0.2)
    }
    blip(660, 0, 0.18)
    blip(880, 0.22, 0.12)
  } catch (error) {
    /* audio unavailable */
  }
}

export function isMuted() {
  try {
    return localStorage.getItem('tyelaMute') === '1'
  } catch (error) {
    return false
  }
}

export function toggleMute() {
  const next = !isMuted()
  try {
    localStorage.setItem('tyelaMute', next ? '1' : '0')
  } catch (error) {
    /* ignore */
  }
  return next
}