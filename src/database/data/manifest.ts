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
  // Ajoutez vos entrées ici dans l'ordre des dépendances FK.
  // Exemple :
  // { dataFile: '01-users.data.ts', schemaExport: 'users', label: 'users' },
  // { dataFile: '02-posts.data.ts', schemaExport: 'posts', label: 'posts' },
];
