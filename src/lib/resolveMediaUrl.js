import { normalizeEnvOrigin } from '@/lib/envOrigin'

/**
 * Fix URLs where `Host` / `X-Forwarded-Host` was merged (e.g. `app.vercel.app,%20api.site`).
 * @param {string} url
 */
function fixMergedHostUrl(url) {
  try {
    const u = new URL(url)
    const h = u.hostname
    if (!h.includes(',') && !/%[0-9a-f]{2}/i.test(h)) return url
    const hosts = h.split(',').map((part) => {
      try {
        return decodeURIComponent(part.trim())
      } catch {
        return part.trim()
      }
    }).filter(Boolean)
    if (hosts.length <= 1) return url
    const fixedHost =
      hosts.find((x) => !/\.vercel\.app$/i.test(x) && x.includes('.')) || hosts[hosts.length - 1]
    if (!fixedHost) return url
    u.hostname = fixedHost
    return u.toString()
  } catch {
    return url
  }
}

/**
 * Safe `src` for `<img>`: repairs merged-host absolute URLs and prefixes relative `/uploads` paths.
 * @param {unknown} src
 * @returns {string}
 */
export function resolveMediaUrl(src) {
  if (src == null) return ''
  const t = String(src).trim()
  if (!t) return ''

  if (t.startsWith('//')) {
    return `https:${t}`
  }

  if (/^https?:\/\//i.test(t)) {
    return fixMergedHostUrl(t)
  }

  if (t.startsWith('/')) {
    const base = normalizeEnvOrigin(import.meta.env.VITE_API_ORIGIN)
    return base ? `${base}${t}` : t
  }

  return t
}
