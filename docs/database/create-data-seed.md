# Créer des données de seed

Guide pas à pas pour ajouter des données initiales (seed) pour une table.

## Prérequis

- Le schéma Drizzle de la table doit exister dans `src/database/schemas/`
- Le schéma doit être exporté dans `src/database/schemas.ts`

## 1. Créer le fichier de données

Créez un fichier dans `src/database/data/` :

```ts
// src/database/data/01-products.data.ts
export const productsData = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Widget Pro',
    price: 2999,
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    name: 'Widget Lite',
    price: 999,
  },
];
```

### Conventions de nommage

- Préfixe numérique pour l'ordre visuel : `01-products.data.ts`, `02-orders.data.ts`
- Suffixe `.data.ts` obligatoire
- Exportez un tableau nommé (le seed prend le premier `Array` trouvé dans le module)

## 2. Ajouter au manifest

Éditez `src/database/data/manifest.ts` :

```ts
export const seedManifest: SeedEntry[] = [
  { dataFile: '01-products.data.ts', schemaExport: 'products', label: 'products' },
  { dataFile: '02-orders.data.ts', schemaExport: 'orders', label: 'orders' },
];
```

> **Important** : L'ordre du tableau détermine l'ordre d'insertion. Placez les tables parentes avant les tables enfants pour respecter les clés étrangères.

| Champ | Description |
| --- | --- |
| `dataFile` | Nom du fichier dans `src/database/data/` |
| `schemaExport` | Nom de l'export dans `schemas.ts` (ex: `products`, `orders`) |
| `label` | Label affiché dans les logs |

## 3. Lancer le seed

```bash
pnpm run db:seed             # insère les données (ignore les doublons)
pnpm run db:seed -- --reset  # vide les tables puis insère
```

## Structure des fichiers

```md
src/database/
├── data/
│   ├── manifest.ts          ← source de vérité : ordre + mapping
│   ├── 01-products.data.ts  ← données products
│   └── 02-orders.data.ts    ← données orders
├── schemas/
│   ├── products.schema.ts
│   └── orders.schema.ts
└── schemas.ts               ← index de re-export
```

## Normalisation automatique

Le script de seed normalise automatiquement :

- `boolean` → `0` ou `1`
- `Array` → `JSON.stringify()`

## Résolution des erreurs courantes

| Erreur | Cause | Solution |
| --- | --- | --- |
| `Export "xxx" introuvable dans schemas.ts` | `schemaExport` ne correspond à aucun export | Vérifiez le nom exact dans `schemas.ts` |
| `Dataset vide ou introuvable` | Le fichier ne contient pas de tableau exporté | Exportez un tableau (`export const data = [...]`) |
| Erreur FK / constraint violation | Ordre d'insertion incorrect | Déplacez l'entrée après sa dépendance dans le manifest |
