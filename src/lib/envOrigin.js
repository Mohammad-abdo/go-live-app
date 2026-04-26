/**
 * Normalize `VITE_API_ORIGIN` / `VITE_SOCKET_ORIGIN` when mis-set to multiple URLs
 * (e.g. `https://app.vercel.app, https://api.example.com`), which breaks axios baseURL
 * and produces invalid image URLs.
 * @param {unknown} raw
 * @returns {string} origin without trailing slash, or ''
 */
export function normalizeEnvOrigin(raw) {
  let s = String(raw ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (!s) return ''
  if (!/[,\s]/.test(s)) return s
  const chunks = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  const preferApi =
    chunks.find((x) => /^https?:\/\//i.test(x) && !/\.vercel\.app$/i.test(x)) ||
    chunks.find((x) => /^https?:\/\//i.test(x)) ||
    chunks[chunks.length - 1] ||
    ''
  return String(preferApi)
    .trim()
    .replace(/\/+$/, '')
}
