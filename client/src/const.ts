export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Google OAuth login URL — routes through our server's /api/oauth/google endpoint
// which then redirects to Google's consent screen and back to /api/oauth/callback
export const getLoginUrl = (returnPath?: string) => {
  const returnTo = returnPath ?? window.location.pathname;
  const params = new URLSearchParams({ returnTo });
  return `/api/oauth/google?${params.toString()}`;
};
