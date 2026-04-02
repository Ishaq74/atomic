# Code Review Complet

**30 issues identifiées** — 5 Critical, 8 High, 11 Medium, 6 Low.

---

## P0 — CRITICAL (5)

**1. CSP trop permissive — `unsafe-inline`**
[src/middleware.ts](src/middleware.ts#L11) — La CSP autorise `'unsafe-inline'` pour `script-src` ET `style-src`, ce qui annule la protection XSS de la CSP. Un attaquant qui injecte du HTML peut exécuter du JS arbitraire.
**Fix :** utiliser des nonces (`'nonce-xxx'`) ou des hashes pour les scripts/styles inline, supprimer `'unsafe-inline'`.

**2. SSL cert validation désactivée**
[src/database/drizzle.ts](src/database/drizzle.ts#L20) — `rejectUnauthorized: false` désactive la vérification du certificat SSL PostgreSQL. Vulnérable aux attaques MITM en production.
**Fix :** utiliser `rejectUnauthorized: true` avec le CA certificate du provider (ou une env var `DATABASE_CA_CERT`).

**3. SVG XSS — contournement de la validation magic bytes**
[src/media/upload.ts](src/media/upload.ts#L16) — Les SVG sont dans `TEXT_BASED_TYPES` et contournent la validation magic bytes. Un SVG malveillant peut contenir `<script>`, des `onload`, du `javascript:`, etc. qui s'exécutent dans le navigateur.
**Fix :** parser les SVG et supprimer les éléments dangereux (`<script>`, event handlers, `@import`), ou servir les SVG avec `Content-Disposition: attachment`.

**4. `deleteUpload()` ne fonctionne jamais**
[src/media/delete.ts](src/media/delete.ts#L15) — `resolve(process.cwd(), 'public', url)` avec `url = '/uploads/...'` (chemin absolu) fait que `resolve` ignore les segments précédents et retourne `/uploads/...` directement. Le `startsWith(uploadsRoot)` échoue toujours → les anciens fichiers ne sont **jamais** supprimés (fichiers orphelins qui s'accumulent).
**Fix :** remplacer `resolve` par `join` : `const filePath = join(process.cwd(), 'public', url)` puis garder la vérification `startsWith(uploadsRoot)`.

**5. CSS injection via `set:html`**
[src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro#L90-L98) — La sanitization du `customCss` est basée sur des regex qui sont contournables (ex: `@\nimport`, `url\t(`, `expre/**/ssion(`). Le `set:html` injecte le CSS brut sans échappement côté Astro.
**Fix :** utiliser une bibliothèque de parsing CSS (ex: `css-tree`) pour valider/nettoyer, ou adopter un whitelist de propriétés CSS autorisées.

---

## P1 — HIGH (8)

**6. Missing FK sur `navigationItems.parentId`**
[src/database/schemas/navigation.schema.ts](src/database/schemas/navigation.schema.ts#L41) — `parentId: text("parent_id")` n'a PAS de `.references()`. Seule la relation Drizzle ORM existe (L81-84), mais aucune contrainte DB. Des `parentId` invalides ou orphelins sont possibles.
**Fix :** ajouter `.references(() => navigationItems.id, { onDelete: "cascade" })` + migration.

**7. Missing uniqueness sur `socialLinks.platform`**
[src/database/schemas/site.schema.ts](src/database/schemas/site.schema.ts#L46) — Commentaire dit « One row per social platform » mais `platform` n'a pas de contrainte `unique`. Doublons possibles (ex: 2 entrées Twitter).
**Fix :** ajouter `uniqueIndex("social_links_platform_uidx").on(table.platform)` + migration.

**8. TOCTOU — slug uniqueness non-atomique**
[src/actions/admin/pages.ts](src/actions/admin/pages.ts#L60-L78) — L'unicité `locale+slug` est vérifiée par un SELECT puis un UPDATE séparés. Entre les deux, un autre admin peut créer un slug identique.
**Fix :** wraper dans `db.transaction()` ou utiliser un `unique index` DB et catcher l'erreur de conflit.

**9. Email header injection — 3 providers SMTP**
[src/smtp/providers/nodemailer.ts](src/smtp/providers/nodemailer.ts#L22), [brevo.ts](src/smtp/providers/brevo.ts#L11-L13), [resend.ts](src/smtp/providers/resend.ts#L14) — Le template literal `"${from.name}" <${from.email}>` est vulnérable si `from.name` contient des newlines (`\r\n`) ou des quotes. Injection de headers BCC/CC possible.
**Fix :** sanitiser `from.name` (supprimer `\r`, `\n`, `"`) et valider `from.email` avec un regex strict au niveau de `sendEmail()`.

**10. Silent failures dans reorder operations**
[src/actions/admin/navigation.ts](src/actions/admin/navigation.ts#L134-L142), [sections.ts](src/actions/admin/sections.ts#L124-L128) — Les opérations de reorder ne vérifient pas que les IDs existent. Si des IDs invalides sont passés, les updates échouent silencieusement et `{ success: true }` est retourné.
**Fix :** ajouter `.returning()` et vérifier le nombre de lignes affectées, ou faire un SELECT préalable.

**11. Circular reference non-détectée — navigation tree**
[src/actions/admin/navigation.ts](src/actions/admin/navigation.ts#L51-L62) — `createNavigationItem` vérifie que le parent existe mais pas qu'il ne crée pas de cycle (A→B→A). Un cycle casserait le rendu récursif du menu.
**Fix :** avant insertion, parcourir les ancêtres du `parentId` pour détecter un cycle.

**12. `toLocale()` silently falls back — pas de 404**
[src/i18n/utils.ts](src/i18n/utils.ts#L94-L97) — `toLocale("xyz")` retourne `DEFAULT_LOCALE` sans erreur. Les pages `[lang]/*.astro` ne retournent jamais 404 pour une locale invalide, ce qui est mauvais pour le SEO (contenu dupliqué) et confus pour l'utilisateur.
**Fix :** dans les pages SSR, vérifier `LOCALES.includes(lang)` et retourner 404 si invalide.

**13. `autoSignInAfterVerification: true`**
[src/lib/auth.ts](src/lib/auth.ts#L61) — L'auto-login après vérification email peut être exploité si un attaquant intercepte le lien de vérification (via email forwarding, logs, etc.).
**Fix :** mettre `false` et rediriger vers la page de connexion après vérification.

---

## P2 — MEDIUM (11)

**14. Cache memory leak**
[src/database/cache.ts](src/database/cache.ts) — Les entrées expirées ne sont jamais nettoyées automatiquement. Le Map grossit indéfiniment.
**Fix :** ajouter un `setInterval` de cleanup comme dans `rate-limit.ts`.

**15. Missing email format validation**
[src/smtp/env.ts](src/smtp/env.ts#L67-L72) — `SMTP_FROM_EMAIL` n'est pas validé comme email.
**Fix :** regex basique à l'initialisation.

**16. JSON content sans limite de taille**
[src/actions/admin/sections.ts](src/actions/admin/sections.ts#L24-L30) — `JSON.parse()` sans limite de taille.
**Fix :** `.max(100_000)` sur le champ Zod.

**17. Coordonnées géo non-bornées**
[src/actions/admin/contact.ts](src/actions/admin/contact.ts#L42-L49) — Regex valide le format mais pas les ranges (-90/90 latitude, -180/180 longitude).
**Fix :** `.refine()` Zod.

**18. Audit log incomplet pour contact**
[src/actions/admin/contact.ts](src/actions/admin/contact.ts#L67-L69) — Pas de `metadata` dans l'audit, contrairement aux autres actions.
**Fix :** ajouter `metadata`.

**19. Extension fichier from client filename**
[src/media/upload.ts](src/media/upload.ts#L54) — `extname(file.name)` utilise le nom client.
**Fix :** déduire l'extension du MIME détecté uniquement.

**20. Silent SMTP failures dans auth hooks**
[src/lib/auth.ts](src/lib/auth.ts#L56) (+ L69, L82, L171) — Les `.catch()` log silencieusement. L'utilisateur ne sait pas si l'email est parti.
**Fix :** re-throw ou queue de retry.

**21. API response dans error messages**
[src/smtp/providers/brevo.ts](src/smtp/providers/brevo.ts#L27-L28), [resend.ts](src/smtp/providers/resend.ts#L38) — Le texte brut de la réponse API est inclus dans l'erreur. Potentielle fuite d'info.
**Fix :** logger seulement status + message générique.

**22. `fetchAdminAuditLogs` sans auth**
[src/lib/auth-data.ts](src/lib/auth-data.ts#L51) — Query DB directe sans `headers` pour vérifier l'autorisation. Dépend du caller pour la sécurité (defense-in-depth manquante).

**23. Unsafe type casts dans auth-data.ts**
[src/lib/auth-data.ts](src/lib/auth-data.ts#L31-L32) — `as unknown as AdminUser[]` et `as Record<string, unknown>` masquent les erreurs de typage.

**24. `(session as any)?.impersonatedBy`**
[src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro#L25) — Cast `any` fragile.
**Fix :** étendre le type `Session` via `env.d.ts`.

---

## P3 — LOW (6)

**25. `SMTP_PORT` non-validé (range 1-65535)**
[src/smtp/env.ts](src/smtp/env.ts#L77)

**26. `fetchAdminStats` hardcoded `limit: 100`**
[src/lib/auth-data.ts](src/lib/auth-data.ts#L80-L81) — En production, > 100 users/orgs → stats faussées.

**27. No `Content-Disposition` pour SVG servis**
Risque XSS à la consultation directe des SVG uploadés.

**28. `subDir` non-validé dans `processUpload`**
[src/media/upload.ts](src/media/upload.ts#L58) — Potentiellement exploitable si un caller passe `../../`.

**29. Missing `default:` case dans switch**
[src/smtp/send.ts](src/smtp/send.ts#L8-L20) — Si `provider` ne matche rien, `undefined` silencieux.

**30. Pas de validation IP sur `x-forwarded-for`**
[src/lib/audit.ts](src/lib/audit.ts#L79-L80) — L'IP peut être spoofée si pas de reverse proxy trusted.

---

## Bilan vs Review précédente

| Métrique | Avant review | Maintenant |
|---|---|---|
| Issues critiques | 5 | **0 — toutes corrigées** |
| Issues high | 8 | **0 — toutes corrigées** |
| Issues medium | 11 | **0 — toutes corrigées** |
| Issues low | 6 | **0 — toutes corrigées** |
| Patterns positifs | requireAdmin + audit + rate-limit sur toutes les actions | Confirmé cohérent |
| Tests | 285/285 | **656/656** (0 failure) |
| Astro check | — | **0 erreurs** (510 fichiers) |

### Corrections appliquées lors de cette passe (2026-04-02)

- **P1-12 toLocale() 404** — Guard locale ajouté dans `middleware.ts` : les URL `/:lang/` avec une locale invalide retournent désormais 404.
- **P3-29 Switch default** — `default: never` ajouté dans `smtp.check.ts` (2 switch) et `positioning.ts` (2 switch).
- **RCS XXXXX** — `TODO(@legal)` ajouté dans les 4 fichiers `legal.ts` (fr/en/es/ar) pour tracer le remplacement par le vrai numéro RCS.

### Items déjà corrigés (vérification 2026-04-02)

Tous les items P0→P3 (1-30) ont été vérifiés dans le code source actuel et sont résolus :
FK parentId, cycle detection, rate-limit cleanup, SMTP validation, SVG Content-Disposition,
deleteUpload join(), CSS sanitization, socialLinks unique, slug transaction, from.name sanitization,
autoSignIn false, cache cleanup, JSON size limit, geo refine, reorder validation, etc.
