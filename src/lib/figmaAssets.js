/**
 * Local screen exports: copy PNGs into `public/figma_images_for_app/` and use `src/lib/figma_images_for_app.js`.
 *
 * Remote previews from Figma MCP (expire after ~7 days). App falls back to CSS if images fail.
 * File: Dr04r0K9dWskmkfNErc51V — canvas "Test Design" (node 1:2).
 *
 * Onboarding frames: `12:12541`, `13:12770`, `13:12923` (illustrations + top vector patterns).
 */
export const FIGMA_ASSETS = {
  mapMatching: 'https://www.figma.com/api/mcp/asset/b0cf258c-935b-4f08-8dab-70d504ae1609',
  mapRoutePlan: 'https://www.figma.com/api/mcp/asset/94eeed0e-7ee9-4f4e-808e-beb1787ad080',
  mapOffers: 'https://www.figma.com/api/mcp/asset/2bdd56ad-d2fb-4139-8fbf-045b11230543',
  /** `64:3800` — اختر سائق */
  mapSelectDriver: 'https://www.figma.com/api/mcp/asset/0b509237-74c0-4cef-8e17-1bd57eceecf8',
  /** `209:6626` — الرحلة قيد العمل */
  mapTripProgress: 'https://www.figma.com/api/mcp/asset/ac0fa47f-1f1f-4aff-accf-1c5ffe637b1c',
  /** `81:3896` — وصول السائق */
  mapActiveRide: 'https://www.figma.com/api/mcp/asset/5cb18dc7-4255-4476-bb13-c731306ee09d',

  /** Slide 1 hero — node `12:12541` */
  onboardingSlide1: import.meta.env.VITE_ONBOARDING_IMG_1 || 'https://www.figma.com/api/mcp/asset/0b6910c3-ab86-4d88-a6b2-a2939d376b6f',
  /** Slide 2 — node `13:12770` */
  onboardingSlide2:
    import.meta.env.VITE_ONBOARDING_IMG_2 || 'https://www.figma.com/api/mcp/asset/d82d7f82-c780-4f69-9dfd-9880ed3f05cb',
  /** Slide 3 — node `13:12923` (primary art) */
  onboardingSlide3:
    import.meta.env.VITE_ONBOARDING_IMG_3 || 'https://www.figma.com/api/mcp/asset/f9f41090-b23e-43f8-9e95-ce8f48af4401',

  /** Decorative purple header shapes per slide (optional; improves match to Figma). */
  onboardingPattern1:
    import.meta.env.VITE_ONBOARDING_PATTERN_1 || 'https://www.figma.com/api/mcp/asset/fde48bcc-3620-4024-a6ce-a72d5aa349b2',
  onboardingPattern2:
    import.meta.env.VITE_ONBOARDING_PATTERN_2 || 'https://www.figma.com/api/mcp/asset/8caaea23-b3b6-4dd0-8af0-bcca578d8910',
  onboardingPattern3:
    import.meta.env.VITE_ONBOARDING_PATTERN_3 || 'https://www.figma.com/api/mcp/asset/b3c29813-c2bc-47ba-9011-0ab3298754c4',

  /** Splash center mark — node `12:12015` (fallback if local PNG missing). */
  splashLogoGroup: 'https://www.figma.com/api/mcp/asset/2ed43322-f25e-40c2-8343-7300ada2aae4',

  /** @deprecated use onboardingSlide1 */
  onboardingHero: import.meta.env.VITE_ONBOARDING_IMG_1 || 'https://www.figma.com/api/mcp/asset/0b6910c3-ab86-4d88-a6b2-a2939d376b6f',
}
