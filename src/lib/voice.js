import speakTtsModule from 'speak-tts'

/** CommonJS default export → ESM: `import x from 'speak-tts'` is often `{ default: class }`, not the class itself. */
function getSpeakTtsClass() {
  const m = speakTtsModule
  if (m == null) return null
  if (typeof m === 'function') return m
  if (typeof m.default === 'function') return m.default
  return null
}

let speechInstance = null
let speechInitOk = false

export async function ensureVoice() {
  const Ctor = getSpeakTtsClass()
  if (!Ctor) return false
  if (speechInitOk) return true
  try {
    speechInstance = new Ctor()
    await speechInstance.init({ volume: 0.85, lang: 'en-US', rate: 1.0, pitch: 1.0 })
    speechInitOk = true
    return true
  } catch {
    speechInstance = null
    speechInitOk = false
    return false
  }
}

/** Uses `speak-tts` when the constructor resolves; always falls back to Web Speech API. */
export async function speak(text) {
  const str = String(text)

  const ttsOk = await ensureVoice()
  if (ttsOk && speechInstance) {
    try {
      await speechInstance.speak({ text: str })
      return
    } catch {
      /* fall through */
    }
  }

  if (typeof window !== 'undefined' && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(str)
      u.lang = 'en-US'
      u.rate = 1
      window.speechSynthesis.speak(u)
    } catch {
      /* ignore */
    }
  }
}
