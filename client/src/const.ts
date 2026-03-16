export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL — routes to the unified /login page with all sign-in options
export const getLoginUrl = (returnPath?: string) => {
  const returnTo = returnPath ?? window.location.pathname;
  const params = new URLSearchParams({ returnTo });
  return `/login?${params.toString()}`;
};
