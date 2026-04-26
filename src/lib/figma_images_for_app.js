/**
 * Static rider UI references served from `public/figma_images_for_app/`.
 * Export screens from Figma to PNG, copy files here, then add keys below.
 */
const BASE = (import.meta.env.VITE_FIGMA_IMAGES_BASE || '/figma_images_for_app').replace(/\/$/, '')

export function figmaAppImage(filename) {
  if (!filename) return ''
  return `${BASE}/${encodeURIComponent(filename)}`
}

/** Named slots — point to real filenames after you copy assets into public/figma_images_for_app */
export const FIGMA_APP_IMAGES = {
  // tripStatus: figmaAppImage('trip-status.png'),
  // splash: figmaAppImage('splash.png'),
}
