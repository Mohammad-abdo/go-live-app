0) Driver screens spec: https://www.figma.com/design/Dr04r0K9dWskmkfNErc51V/Go-Back?node-id=146-4074&m=dev (canvas "Driver Version"; see src/lib/figma_images_for_app.js FIGMA_DRIVER_DESIGN).
1) Export frames from Figma as PNG (2x) for: splash, home map, trip-active, chat, OTP, cancel sheets.
2) Save files here, e.g. trip-active.png
3) In the app, optional: set VITE_FIGMA_IMAGES_BASE or import paths from src/lib/figma_images_for_app.js
4) Pixel-tune CSS next to a reference: open the PNG beside the running app and adjust spacing/colors in ActiveTrip.jsx / TripChat.jsx / VerifyOtp.jsx.
