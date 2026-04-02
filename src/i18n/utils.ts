import {
  type Locale,
  type CommonTranslations,
  type HomeTranslations,
  type AboutTranslations,
  type ContactTranslations,
  type AuthTranslations,
  type AuthPageId,
  type PageId,
  LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
} from './config';

const commonModules: Record<Locale, () => Promise<{ default: CommonTranslations }>> = {
  fr: () => import('./fr/common'),
  en: () => import('./en/common'),
  es: () => import('./es/common'),
  ar: () => import('./ar/common'),
};

const homeModules: Record<Locale, () => Promise<{ default: HomeTranslations }>> = {
  fr: () => import('./fr/home'),
  en: () => import('./en/home'),
  es: () => import('./es/home'),
  ar: () => import('./ar/home'),
};

export async function getCommonTranslations(locale: Locale): Promise<CommonTranslations> {
  const mod = await commonModules[locale]();
  return mod.default;
}

export async function getHomeTranslations(locale: Locale): Promise<HomeTranslations> {
  const mod = await homeModules[locale]();
  return mod.default;
}

const aboutModules: Record<Locale, () => Promise<{ default: AboutTranslations }>> = {
  fr: () => import('./fr/about'),
  en: () => import('./en/about'),
  es: () => import('./es/about'),
  ar: () => import('./ar/about'),
};

export async function getAboutTranslations(locale: Locale): Promise<AboutTranslations> {
  const mod = await aboutModules[locale]();
  return mod.default;
}

const contactModules: Record<Locale, () => Promise<{ default: ContactTranslations }>> = {
  fr: () => import('./fr/contact'),
  en: () => import('./en/contact'),
  es: () => import('./es/contact'),
  ar: () => import('./ar/contact'),
};

export async function getContactTranslations(locale: Locale): Promise<ContactTranslations> {
  const mod = await contactModules[locale]();
  return mod.default;
}

// ─── Auth ────────────────────────────────────────────────────────────

const authModules: Record<Locale, () => Promise<{ default: AuthTranslations }>> = {
  fr: () => import('./fr/auth'),
  en: () => import('./en/auth'),
  es: () => import('./es/auth'),
  ar: () => import('./ar/auth'),
};

export async function getAuthTranslations(locale: Locale): Promise<AuthTranslations> {
  const mod = await authModules[locale]();
  return mod.default;
}

export function getAuthUrl(locale: Locale, pageId: AuthPageId, authTranslations: AuthTranslations): string {
  return `/${locale}/auth/${authTranslations.routes[pageId]}`;
}

export function resolveAuthSlug(slug: string, authTranslations: AuthTranslations): AuthPageId | null {
  const entries = Object.entries(authTranslations.routes) as [AuthPageId, string][];
  const match = entries.find(([, s]) => s === slug);
  return match ? match[0] : null;
}

// ─── Admin & Org direct routes ──────────────────────────────────────

export type AdminSubpage = 'stats' | 'users' | 'organizations' | 'audit' | 'site' | 'navigation' | 'pages' | 'theme';
export type OrgSubpage = 'members' | 'settings';

export function getAdminUrl(locale: Locale, subpage?: AdminSubpage): string {
  return subpage ? `/${locale}/admin/${subpage}` : `/${locale}/admin`;
}

export function getOrgUrl(locale: Locale, orgSlug: string, subpage?: OrgSubpage): string {
  return subpage
    ? `/${locale}/organizations/${orgSlug}/${subpage}`
    : `/${locale}/organizations/${orgSlug}`;
}

// ─── Pages (about / contact / legal) ────────────────────────────────

export function getPageUrl(locale: Locale, pageId: PageId, commonTranslations: CommonTranslations): string {
  return `/${locale}/${commonTranslations.pageRoutes[pageId]}`;
}

export function resolvePageSlug(slug: string, commonTranslations: CommonTranslations): PageId | null {
  const entries = Object.entries(commonTranslations.pageRoutes) as [PageId, string][];
  const match = entries.find(([, s]) => s === slug);
  return match ? match[0] : null;
}

export function toLocale(value: string | undefined): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

export function isValidLocale(value: string | undefined): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}
