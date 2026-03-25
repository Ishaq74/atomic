import { auth } from "@/lib/auth";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  let timedOut = false;
  let isAuthed: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;

  const sessionPromise = auth.api.getSession({ headers: context.request.headers });

  try {
    isAuthed = await Promise.race([
      sessionPromise,
      new Promise<null>((resolve) => setTimeout(() => { timedOut = true; resolve(null); }, 5000)),
    ]);
  } catch (err) {
    console.error('[middleware] Session check failed:', err);
    isAuthed = null;
  }

  // Prevent unhandled rejection from the orphaned getSession promise.
  // The pool-level statement_timeout (30s) bounds how long the leaked query can run.
  // TODO: Use AbortController signal when better-auth supports it to cancel the
  // orphaned promise instead of letting it run in the background.
  sessionPromise.catch((err) => {
    if (timedOut) console.warn('[middleware] Orphaned session check failed after timeout:', err);
  });

  if (timedOut) {
    console.warn('[middleware] Session check timed out (5s) — returning 503');
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Retry-After': '5', 'Content-Type': 'application/json' },
    });
  }

  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  const response = await next();

  // Serve SVG/SVGZ uploads as attachments to prevent XSS
  const url = new URL(context.request.url);
  const lowerPath = url.pathname.toLowerCase();
  if (lowerPath.startsWith('/uploads/') && (lowerPath.endsWith('.svg') || lowerPath.endsWith('.svgz'))) {
    response.headers.set('Content-Disposition', 'attachment');
    response.headers.set('Content-Type', 'image/svg+xml');
  }

  const securityHeaders: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '0',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.iconify.design; frame-src https://www.google.com https://www.youtube.com https://player.vimeo.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  };

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
});
