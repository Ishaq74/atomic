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
  // ── Site customization (respect FK order) ──
  { dataFile: '03-site-settings.data.ts', schemaExport: 'siteSettings', label: 'site settings' },
  { dataFile: '04-social-links.data.ts', schemaExport: 'socialLinks', label: 'social links' },
  { dataFile: '05-contact-info.data.ts', schemaExport: 'contactInfo', label: 'contact info' },
  { dataFile: '06-opening-hours.data.ts', schemaExport: 'openingHours', label: 'opening hours' },
  { dataFile: '07-navigation.data.ts', schemaExport: 'navigationMenus', label: 'navigation menus' },
  { dataFile: '07b-navigation-items.data.ts', schemaExport: 'navigationItems', label: 'navigation items' },
  { dataFile: '08-theme.data.ts', schemaExport: 'themeSettings', label: 'theme settings' },
];
