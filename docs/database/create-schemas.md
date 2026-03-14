# Créer un schéma Drizzle

Guide pas à pas pour ajouter une nouvelle table à la base de données.

## 1. Créer le fichier de schéma

Créez un fichier dans `src/database/schemas/` :

```ts
// src/database/schemas/products.schema.ts
import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## 2. Exporter depuis `schemas.ts`

Ajoutez l'export dans `src/database/schemas.ts` :

```ts
export * from './schemas/products.schema';
```

> **Astuce** : `db:generate` détecte automatiquement les fichiers non exportés et propose de les ajouter.

## 3. Générer la migration

```bash
pnpm run db:generate
```

Cela crée un fichier `.sql` dans `src/database/migrations/`.

## 4. Appliquer la migration

```bash
pnpm run db:migrate
```

## Structure des fichiers

```md
src/database/
├── schemas.ts              ← index de re-export (ne pas mettre de schémas ici)
├── schemas/
│   ├── products.schema.ts  ← définition de table
│   ├── orders.schema.ts
│   └── categories.schema.ts
├── migrations/
│   ├── 0000_*.sql
│   └── meta/_journal.json
└── drizzle.ts              ← pool + getDrizzle()
```

## Conventions

- Un fichier = une table (ou un groupe de tables liées)
- Nommez le fichier comme la table principale avec le suffixe `.schema.ts` (ex: `products.schema.ts` pour la table `products`)
- Exportez le nom de la table en camelCase (ex: `export const products`)
- Le nom dans `pgTable('...')` doit être en snake_case
- Les relations Drizzle peuvent être dans le même fichier que la table
