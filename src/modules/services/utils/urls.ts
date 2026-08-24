import type { Locale } from "@i18n/config";

export function buildServiceUrl(locale: Locale, organizationId: string | null, slug: string, categorySlug?: string | null): string {
  const base = organizationId ? `/${locale}/organizations/${organizationId}/services` : `/${locale}/services`;
  return categorySlug ? `${base}/${categorySlug}/${slug}` : `${base}/${slug}`;
}

export function buildServiceCategoryUrl(locale: Locale, organizationId: string | null, slug: string): string {
  const base = organizationId ? `/${locale}/organizations/${organizationId}/services` : `/${locale}/services`;
  return `${base}/${slug}`;
}
