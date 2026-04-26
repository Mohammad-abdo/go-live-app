/**
 * Static rider UI references served from `public/figma_images_for_app/`.
 * Export screens from Figma to PNG, copy files here, then add keys below.
 *
 * Driver UI source (Figma — Dev Mode): canvas **Driver Version** and frames such as online home `147:6164`.
 * @see https://www.figma.com/design/Dr04r0K9dWskmkfNErc51V/Go-Back?node-id=146-4074&m=dev
 */
export const FIGMA_DRIVER_DESIGN = {
  fileKey: 'Dr04r0K9dWskmkfNErc51V',
  /** Page / canvas: Driver Version */
  driverCanvasNodeId: '146:4074',
  /** Reference frame: map + stats + stacked requests (online) */
  driverHomeOnlineFrameId: '147:6164',
  /** Active trip — map, rider row, «وصلت لنقطة الالتقاء», chat notes, cancel */
  driverActiveTripFrameId: '166:1165',
  /** Trips history list (rows with status / pins) */
  driverTripsHistoryFrameId: '258:7519',
  devModeUrl:
    'https://www.figma.com/design/Dr04r0K9dWskmkfNErc51V/Go-Back?node-id=146-4074&m=dev',
}
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
