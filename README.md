# Atomic

Application web SSR multi-langue avec authentification complète, gestion d'organisations et audit trail.

## Stack

| Technologie | Rôle |
| :-- | :-- |
| **Astro 6** (`@astrojs/node`) | Framework SSR |
| **better-auth** | Authentification (email/password, admin, organisations) |
| **Drizzle ORM** + **PostgreSQL 16** | Base de données |
| **Tailwind CSS 4** + **Starwind** | Design system (45+ composants) |
| **Vitest** + **Playwright** | Tests (179 tests) |
| **GitHub Actions** | CI/CD |

## Prérequis

- **Node.js** >= 22.12.0
- **pnpm** >= 10
- **PostgreSQL** >= 16

## Installation

```bash
# Cloner et installer
pnpm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos identifiants PostgreSQL et SMTP

# Créer la base et appliquer les migrations
pnpm db:migrate

# (Optionnel) Peupler la base avec les données de test
pnpm db:seed

# Lancer le serveur de développement
pnpm dev
```

L'application sera disponible sur `http://localhost:4321`.

## Configuration

Copier `.env.example` et renseigner :

| Variable | Description |
| :-- | :-- |
| `DB_ENV` | Environnement (`LOCAL`, `PROD`, `TEST`) |
| `DATABASE_URL_LOCAL` | URL PostgreSQL locale |
| `BETTER_AUTH_SECRET` | Clé secrète auth (min 32 chars) |
| `BETTER_AUTH_URL` | URL de l'application |
| `SMTP_PROVIDER` | Provider email (`BREVO`, `RESEND`, `NODEMAILER`) |
| `SMTP_FROM_EMAIL` | Adresse d'expédition |

Voir `.env.example` pour la liste complète.

## Scripts

### Développement

| Commande | Action |
| :-- | :-- |
| `pnpm dev` | Serveur de développement (port 4321) |
| `pnpm build` | Build de production |
| `pnpm preview` | Preview du build |
| `pnpm lint` | ESLint |
| `pnpm lint:fix` | ESLint avec auto-fix |

### Base de données

| Commande | Action |
| :-- | :-- |
| `pnpm db:check` | Vérifier la connexion |
| `pnpm db:migrate` | Appliquer les migrations |
| `pnpm db:generate` | Générer une migration depuis les schémas |
| `pnpm db:seed` | Peupler la base |
| `pnpm db:reset` | Réinitialiser la base |
| `pnpm db:compare` | Comparer les environnements |
| `pnpm db:sync` | Synchroniser les schémas |

### SMTP

| Commande | Action |
| :-- | :-- |
| `pnpm smtp:check` | Vérifier la configuration SMTP |

### Commandes de Tests

| Commande | Action |
| :-- | :-- |
| `pnpm test` | Tests unitaires + intégration (Vitest) |
| `pnpm test:watch` | Tests en mode watch |
| `pnpm test:e2e` | Tests E2E (Playwright) |
| `pnpm test:e2e:ui` | Tests E2E avec UI interactive |

## Structure du projet

```md
src/
├── components/          # Design system
│   ├── atoms/           # 45+ composants de base (Button, Card, Input, Dialog…)
│   ├── molecules/       # Composants composés
│   ├── organisms/       # Header, Footer, Testimonials
│   ├── pages/           # Composants de pages (Home, About, Contact, Auth…)
│   └── wow/             # Effets visuels (particles, marquee, scroll reveal)
├── database/
│   ├── schemas/         # Schémas Drizzle (auth, audit-log)
│   ├── migrations/      # Migrations SQL
│   ├── commands/        # CLI (check, migrate, seed, reset…)
│   └── data/            # Données de seed
├── i18n/                # Internationalisation
│   ├── config.ts        # Locales et configuration
│   ├── utils.ts         # Helpers (URLs, slugs, traductions)
│   ├── fr/ en/ es/ ar/  # Fichiers de traduction
├── lib/
│   ├── auth.ts          # Configuration better-auth (server)
│   ├── auth-client.ts   # Client auth
│   ├── audit.ts         # Audit trail (logAuditEvent, extractIp)
│   └── rate-limit.ts    # Rate limiter in-memory
├── media/               # Upload de fichiers (processUpload, deleteUpload)
├── smtp/
│   ├── providers/       # Brevo, Resend, Nodemailer
│   ├── templates/       # Templates email (i18n)
│   └── send.ts          # Routage des emails
├── pages/
│   ├── [lang]/          # Routes localisées (fr, en, es, ar)
│   └── api/             # Endpoints (auth, export, upload)
├── middleware.ts         # Injection de session auth
└── styles/global.css    # Tailwind CSS
```

## Internationalisation

4 locales supportées :

| Locale | Langue | Direction |
| :-- | :-- | :-- |
| `fr` | Français (défaut) | LTR |
| `en` | English | LTR |
| `es` | Español | LTR |
| `ar` | العربية | RTL |

Toutes les routes sont préfixées par la locale : `/fr/`, `/en/`, `/es/`, `/ar/`.

## Authentification

Basée sur **better-auth** avec les fonctionnalités :

- Inscription avec Username / Connexion par email + mot de passe
- Vérification d'email
- Réinitialisation de mot de passe
- Rôles (user / admin)
- Organisations (création, invitations, membres)
- Impersonation admin
- Suppression de compte (RGPD)
- Audit trail automatique (hooks)

## Tests

**179 tests** répartis en 3 suites :

| Suite | Fichiers | Tests |
| :-- | --: | --: |
| Unit (Vitest) | 10 | 108 |
| Integration (Vitest) | 8 | 49 |
| E2E (Playwright) | 2 | 22 |
| **Total** | **20** | **179** |

Voir `docs/testing/` pour la documentation complète.

## CI/CD

Pipeline GitHub Actions sur chaque push/PR vers `main` :

1. **Lint & Type Check** — ESLint + `astro check`
2. **Unit & Integration** — Vitest (PostgreSQL 16)
3. **E2E** — Playwright (Chromium)

## Documentation

| Dossier | Contenu |
| :-- | :-- |
| `docs/testing/` | Tests (unit, integration, E2E, CI, gaps) |
| `docs/better-auth/` | Auth, plugins, concepts |
| `docs/database/` | Commandes DB, schémas, migrations |
| `docs/smtp/` | Providers, configuration |
| `docs/media/` | Upload de fichiers |
| `docs/design/` | Design System et Composants UI |

## Licence

Projet privé.
