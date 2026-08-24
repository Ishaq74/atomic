export const SERVICE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
export type ServiceCategoryId = string;
export type ServiceTagId = string;

export interface ServiceTranslationDetail {
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  locationLabel: string | null;
  locationAddress: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
}

export interface ServiceListItem {
  service: {
    id: string;
    organizationId: string | null;
    providerId: string;
    slug: string;
    status: ServiceStatus;
    coverImageId: string | null;
    priceMinor: number | null;
    currency: string | null;
    durationMinutes: number | null;
    maxParticipants: number | null;
    isMobile: boolean;
    isFeatured: boolean;
    viewCount: number;
    ratingAverage100: number;
    ratingCount: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  translation: { locale: string; title: string; slug: string; excerpt: string | null } | null;
  provider: { id: string; name: string | null; image: string | null } | null;
  categories: { id: string; slug: string; name: string | null }[];
}

export interface ServiceDetail {
  service: ServiceListItem["service"];
  translation: ServiceTranslationDetail | null;
  provider: ServiceListItem["provider"];
  categories: ServiceListItem["categories"];
  tags: { id: string; slug: string; name: string | null }[];
  media: { id: string; mediaId: string; kind: "GALLERY" | "DOCUMENT"; altText: string; caption: string | null; sortOrder: number }[];
  availability: { id: string; dayOfWeek: number; startTime: string; endTime: string; timezone: string; maxParticipants: number | null }[];
  seo: { locale: string; focusKeyword: string | null; metaRobots: string | null; schemaMarkup: string | null } | null;
}

export const SERVICE_REACTION_TYPES = ["LIKE", "LOVE", "FIRE", "CLAP"] as const;
export type ServiceReactionType = (typeof SERVICE_REACTION_TYPES)[number];
