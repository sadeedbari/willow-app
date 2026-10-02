// Dependency-free so next.config.ts can import it by relative path.

// Pages Next prerenders at build time. A nonce can only be added while a
// request is being rendered, so these can't carry the strict nonce policy;
// they get STATIC_CSP via next.config.ts instead. They hold no signed-in or
// client data. Adding a new static page? List it here -- otherwise the proxy
// applies the nonce policy to it and its scripts will be blocked.
export const STATIC_CSP_PATHS = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/vs/jane-app",
  "/vs/owl-practice",
  "/forgot-password",
  "/forgot-password/check-email",
  "/portal/forgot-password",
  "/portal/forgot-password/check-email",
  "/signup/check-email",
];

// Google Analytics runs on the marketing funnel only (see marketing-analytics.tsx).
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googletagmanager.com",
];
const GA_IMG = ["https://www.google-analytics.com", "https://www.googletagmanager.com"];

const FORM_ACTION = ["'self'", "https://checkout.stripe.com", "https://connect.stripe.com", "https://billing.stripe.com"];

function join(parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function supabaseOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const origin = new URL(url).origin;
  return [origin, origin.replace(/^https:/, "wss:")];
}

const isDev = process.env.NODE_ENV === "development";

// Strict policy for every server-rendered page: scripts need this request's
// nonce, so injected inline script can't run and nothing loads from a host
// that isn't listed. Inline style attributes (used for grid layout) are why
// style-src keeps 'unsafe-inline'.
export function nonceCsp(nonce: string, { analytics }: { analytics: boolean }): string {
  const [supabaseHttp, supabaseWs] = supabaseOrigins();
  return [
    "default-src 'self'",
    join(["script-src 'self'", `'nonce-${nonce}'`, analytics && GA_SCRIPT, isDev && "'unsafe-eval'"]),
    "style-src 'self' 'unsafe-inline'",
    join(["img-src 'self' data: blob:", supabaseHttp, ...(analytics ? GA_IMG : [])]),
    "font-src 'self' data:",
    join(["connect-src 'self'", supabaseHttp, supabaseWs, ...(analytics ? GA_CONNECT : [])]),
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${FORM_ACTION.join(" ")}`,
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    !isDev && "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

// For the prerendered pages above: no nonce is possible, so inline script is
// allowed -- the remaining directives still restrict where everything else
// can load from and where forms can post.
export const STATIC_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GA_IMG.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' ${GA_CONNECT.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  `form-action ${FORM_ACTION.join(" ")}`,
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");
