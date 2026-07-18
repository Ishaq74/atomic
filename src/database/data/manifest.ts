// Seed manifest — source de vérité pour l'ordre et le mapping data → schema.
// Chaque entrée lie un fichier de données à son export de schéma Drizzle.
//
// Usage :
//   1. Créez votre schéma dans src/database/schemas/  (ex: users.ts)
//   2. Exportez-le depuis src/database/schemas.ts      (export * from './schemas/users')
//   3. Créez vos données dans src/database/data/       (ex: 01-users.data.ts)
//   4. Ajoutez une entrée ci-dessous
//
// L'ordre du tableau détermine l'ordre d'insertion (respectez les dépendances FK).

export interface SeedEntry {
  /** Nom du fichier data (sans chemin, ex: '01-users.data.ts') */
  dataFile: string;
  /** Nom de l'export du schéma Drizzle dans schemas.ts (ex: 'users') */
  schemaExport: string;
  /** Nom lisible pour les logs */
  label: string;
}

export const seedManifest: SeedEntry[] = [
  // ── Media (référencé par les galleries blog) ──
  { dataFile: '00-media.data.ts', schemaExport: 'mediaFolders', label: 'media folders' },
  { dataFile: '00b-media-files.data.ts', schemaExport: 'mediaFiles', label: 'media files' },

  // ── Auth: users, credentials, organizations (réutilisés par le blog) ──
  { dataFile: '01-users.data.ts', schemaExport: 'user', label: 'users' },
  { dataFile: '01b-user-accounts.data.ts', schemaExport: 'account', label: 'user accounts' },
  { dataFile: '02-organizations.data.ts', schemaExport: 'organization', label: 'organizations' },
  { dataFile: '02b-organization-members.data.ts', schemaExport: 'member', label: 'organization members' },

  // ── Site customization (respect FK order) ──
  { dataFile: '03-site-settings.data.ts', schemaExport: 'siteSettings', label: 'site settings' },
  { dataFile: '04-social-links.data.ts', schemaExport: 'socialLinks', label: 'social links' },
  { dataFile: '05-contact-info.data.ts', schemaExport: 'contactInfo', label: 'contact info' },
  { dataFile: '06-opening-hours.data.ts', schemaExport: 'openingHours', label: 'opening hours' },
  { dataFile: '07-navigation.data.ts', schemaExport: 'navigationMenus', label: 'navigation menus' },
  { dataFile: '07b-navigation-items.data.ts', schemaExport: 'navigationItems', label: 'navigation items' },
  { dataFile: '08-theme.data.ts', schemaExport: 'themeSettings', label: 'theme settings' },
  { dataFile: '09-legal-pages.data.ts', schemaExport: 'pages', label: 'legal pages' },
  { dataFile: '09b-legal-sections.data.ts', schemaExport: 'pageSections', label: 'legal page sections' },
  { dataFile: '10-consent-settings.data.ts', schemaExport: 'consentSettings', label: 'consent settings' },

  // ── Blog: categories & tags (global + org-scoped) ──
  { dataFile: '11-blog-categories.data.ts', schemaExport: 'blogCategories', label: 'blog categories' },
  { dataFile: '11b-blog-category-translations.data.ts', schemaExport: 'blogCategoryTranslations', label: 'blog category translations' },
  { dataFile: '12-blog-tags.data.ts', schemaExport: 'blogTags', label: 'blog tags' },
  { dataFile: '12b-blog-tag-translations.data.ts', schemaExport: 'blogTagTranslations', label: 'blog tag translations' },

  // ── Blog: posts, translations, SEO, revisions ──
  { dataFile: '13-blog-posts.data.ts', schemaExport: 'blogPosts', label: 'blog posts' },
  { dataFile: '13b-blog-post-translations.data.ts', schemaExport: 'blogPostTranslations', label: 'blog post translations' },
  { dataFile: '15-blog-post-seo.data.ts', schemaExport: 'blogPostSeo', label: 'blog post seo' },
  { dataFile: '15b-blog-post-revisions.data.ts', schemaExport: 'blogPostRevisions', label: 'blog post revisions' },

  // ── Blog: junctions ──
  { dataFile: '14-blog-post-categories.data.ts', schemaExport: 'blogPostCategories', label: 'blog post categories' },
  { dataFile: '14b-blog-post-tags.data.ts', schemaExport: 'blogPostTags', label: 'blog post tags' },

  // ── Blog: comments & moderations ──
  { dataFile: '16-blog-comments.data.ts', schemaExport: 'blogComments', label: 'blog comments' },
  { dataFile: '16b-blog-comment-moderations.data.ts', schemaExport: 'blogCommentModerations', label: 'blog comment moderations' },

  // ── Blog: reviews & helpful ──
  { dataFile: '17-blog-reviews.data.ts', schemaExport: 'blogPostReviews', label: 'blog reviews' },
  { dataFile: '17b-blog-review-helpful.data.ts', schemaExport: 'blogPostReviewHelpful', label: 'blog review helpful' },

  // ── Blog: reactions & favorites ──
  { dataFile: '18-blog-reactions.data.ts', schemaExport: 'blogPostReactions', label: 'blog reactions' },
  { dataFile: '18b-blog-favorites.data.ts', schemaExport: 'blogPostFavorites', label: 'blog favorites' },

  // ── Blog: reports, links, locks, notifications, subscribers, galleries ──
  { dataFile: '19-blog-reports.data.ts', schemaExport: 'blogReports', label: 'blog reports' },
  { dataFile: '20-blog-post-links.data.ts', schemaExport: 'blogPostLinks', label: 'blog post links' },
  { dataFile: '20b-blog-post-locks.data.ts', schemaExport: 'blogPostLocks', label: 'blog post locks' },
  { dataFile: '21-blog-notifications.data.ts', schemaExport: 'blogNotifications', label: 'blog notifications' },
  { dataFile: '22-blog-subscribers.data.ts', schemaExport: 'blogSubscribers', label: 'blog subscribers' },
  { dataFile: '23-blog-post-galleries.data.ts', schemaExport: 'blogPostGalleries', label: 'blog post galleries' },
  { dataFile: '23b-blog-post-gallery-media.data.ts', schemaExport: 'blogPostGalleryMedia', label: 'blog post gallery media' },
];
