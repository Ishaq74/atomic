import { z } from "astro/zod";
import type { Locale } from "@i18n/config";
import { isValidLocale } from "@i18n/utils";

export const serviceStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"]);
export const serviceOrganizationIdSchema = z.string().trim().min(1).optional().nullable();
const localeSchema = z.string().refine((value): value is Locale => isValidLocale(value), "Unsupported locale");
const slugSchema = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens.");

export const serviceFormSchema = z.object({
  organizationId: serviceOrganizationIdSchema,
  locale: localeSchema,
  title: z.string().trim().min(1).max(180),
  slug: slugSchema,
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().min(1),
  status: serviceStatusSchema.default("DRAFT"),
  publishedAt: z.coerce.date().optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
  ogImageId: z.string().uuid().optional().nullable(),
  priceMinor: z.coerce.number().int().min(0).max(2_147_483_647).optional().nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().max(100_000).optional().nullable(),
  maxParticipants: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
  isMobile: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).max(100).default([]),
  tagIds: z.array(z.string().uuid()).max(100).default([]),
});

export const serviceUpdateSchema = serviceFormSchema.partial().extend({ id: z.string().uuid() });

export const serviceListFiltersSchema = z.object({
  organizationId: serviceOrganizationIdSchema,
  page: z.coerce.number().int().positive().max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: serviceStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  providerId: z.string().trim().min(1).max(200).optional(),
  featured: z.coerce.boolean().optional(),
  mobile: z.coerce.boolean().optional(),
  locale: localeSchema.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title", "priceMinor", "ratingAverage100", "viewCount"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const serviceAvailabilitySchema = z.object({
  serviceId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(1).max(64),
  maxParticipants: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
}).refine((value) => value.startTime < value.endTime, { path: ["endTime"], message: "End time must be after start time." });

export function calculateServiceSeoScore(input: { title?: string; metaTitle?: string; metaDescription?: string; focusKeyword?: string }): number {
  let score = 0;
  if (input.title?.trim()) score += 25;
  if (input.metaTitle?.trim()) score += 20;
  if (input.metaDescription?.trim()) score += 20;
  if (input.focusKeyword?.trim()) score += 15;
  if ((input.title?.length ?? 0) >= 25) score += 10;
  if ((input.metaDescription?.length ?? 0) >= 80) score += 10;
  return Math.min(100, score);
}
