// proxy.ts
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const LOCALES = ['en', 'fr', 'nl'] as const;

/**
 * next-intl routing ONLY applies to the marketing/public landing page.
 * Dashboard routes use cookie-based locale detection (no URL prefix).
 */
const handleI18nRouting = createIntlMiddleware({
  locales: LOCALES,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

/**
 * Paths that belong to the authenticated app shell.
 * These skip next-intl URL routing entirely — locale is read from the cookie.
 */
const APP_PATHS = [
  '/dashboard',
  '/jobs',
  '/applications',
  '/profile',
  '/settings',
  '/pipeline',
  '/login',
  '/callback',
];

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function isApiProxyPath(pathname: string): boolean {
  return (
    pathname === "/backend-api" ||
    pathname.startsWith("/backend-api/") ||
    pathname === "/job-engine-api" ||
    pathname.startsWith("/job-engine-api/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Same-origin API proxies — do not locale-prefix these.
  if (isApiProxyPath(pathname)) {
    return await updateSession(request);
  }

  // ── App / dashboard routes ──────────────────────────────────────────────
  // Skip next-intl completely. Auth middleware handles session refresh + auth guard.
  if (isAppPath(pathname)) {
    return await updateSession(request);
  }

  // ── Public / marketing routes ───────────────────────────────────────────
  // Let next-intl handle locale detection & prefix-based redirects first.
  const i18nResponse = handleI18nRouting(request);

  // If next-intl issued a redirect or error, honour it immediately.
  if (i18nResponse.status !== 200) {
    return i18nResponse;
  }

  // Refresh the Supabase session and forward next-intl headers so Server
  // Components can read x-next-intl-locale etc.
  const supabaseResponse = await updateSession(request);
  i18nResponse.headers.forEach((value, key) => {
    supabaseResponse.headers.set(key, value);
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|backend-api|job-engine-api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};