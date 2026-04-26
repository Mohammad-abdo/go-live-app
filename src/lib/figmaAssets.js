/**
 * Remote previews from Figma MCP (expire after ~7 days). App falls back to CSS if images fail.
 * File: Dr04r0K9dWskmkfNErc51V — canvas "Test Design" (node 1:2).
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
  /** Onboarding — asset from Figma MCP; override per slide via `VITE_ONBOARDING_IMG_1` … `_3` */
  onboardingSlide1: import.meta.env.VITE_ONBOARDING_IMG_1 || 'https://www.figma.com/api/mcp/asset/3e729426-6b07-4fef-9b3c-9d352108f401',
  onboardingSlide2:
    import.meta.env.VITE_ONBOARDING_IMG_2 || 'https://www.figma.com/api/mcp/asset/3e729426-6b07-4fef-9b3c-9d352108f401',
  onboardingSlide3:
    import.meta.env.VITE_ONBOARDING_IMG_3 || 'https://www.figma.com/api/mcp/asset/3e729426-6b07-4fef-9b3c-9d352108f401',
  /** @deprecated use onboardingSlide1 */
  onboardingHero: import.meta.env.VITE_ONBOARDING_IMG_1 || 'https://www.figma.com/api/mcp/asset/3e729426-6b07-4fef-9b3c-9d352108f401',
}
