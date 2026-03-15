import { toLocale, getAuthTranslations } from '@i18n/utils';
import type { Locale } from '@i18n/config';

type AstroContext = {
  params: Record<string, string | undefined>;
  locals: { user: any; session: any };
  redirect: (url: string, status?: number) => Response;
};

async function resolveLocale(astro: AstroContext) {
  const locale = toLocale(astro.params.lang) as Locale;
  const authT = await getAuthTranslations(locale);
  return { locale, authT };
}

function signInUrl(locale: Locale, authT: { routes: Record<string, string> }) {
  return `/${locale}/auth/${authT.routes['sign-in']}`;
}

function dashboardUrl(locale: Locale, authT: { routes: Record<string, string> }) {
  return `/${locale}/auth/${authT.routes['dashboard']}`;
}

/** Require authenticated user. Redirects guests to sign-in. */
export async function requireAuth(astro: AstroContext) {
  const { locale, authT } = await resolveLocale(astro);
  const user = astro.locals.user;
  if (!user) {
    return { redirect: astro.redirect(signInUrl(locale, authT)) };
  }
  return { user, locale, authT };
}

/** Require admin role. Redirects guests to sign-in, non-admins to dashboard. */
export async function requireAdmin(astro: AstroContext) {
  const { locale, authT } = await resolveLocale(astro);
  const user = astro.locals.user;
  if (!user) {
    return { redirect: astro.redirect(signInUrl(locale, authT)) };
  }
  if (user.role !== 'admin') {
    return { redirect: astro.redirect(dashboardUrl(locale, authT)) };
  }
  return { user, locale, authT };
}
