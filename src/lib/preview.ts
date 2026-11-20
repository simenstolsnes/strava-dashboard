// Login for Vercel preview deployments.
//
// Strava allows one callback domain (production), so a preview can't receive
// the OAuth redirect itself. Instead the preview sends you to production's
// login with ?next=<preview origin>; after Strava approves, production sends
// you back to the preview with a short-lived signed hand-off token.

/** This project's preview URLs only, e.g. https://training-dashboard-git-my-branch-simen11.vercel.app */
const PREVIEW_ORIGIN = /^https:\/\/training-dashboard-[a-z0-9-]+-simen11\.vercel\.app$/;

export const isAllowedPreviewOrigin = (origin: string | null | undefined): origin is string =>
  !!origin && PREVIEW_ORIGIN.test(origin);

/** True on a Vercel preview deployment (system env var set by Vercel). */
export const isPreviewDeployment = () => process.env.VERCEL_ENV === "preview";

/** Production origin, from Vercel's system env var. */
export const productionOrigin = () =>
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
