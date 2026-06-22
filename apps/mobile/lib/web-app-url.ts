/** Customer storefront — same UI as https://rabbitor.elseif.ai */
export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ??
  'https://rabbitor.elseif.ai'
