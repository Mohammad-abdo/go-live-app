/** Short in-app chime (Web Audio) — no external asset; respects silent mode when possible. */

let audioCtx

function getCtx() {
  if (typeof window === 'undefined') return null
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new Ctx()
    return audioCtx
  } catch {
    return null
  }
}

/**
 * @param {'notification' | 'chat'} kind
 */
export async function playInAppSound(kind = 'notification') {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // ignore: browser may block autoplay audio until user gesture
      return
    }
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  if (kind === 'chat') {
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.13)
    return
  }

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.085, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.23)
}
