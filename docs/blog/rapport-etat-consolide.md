# Rapport du module Blog — État consolidé

> **Date** : 2026-07-18
> **Stack** : Astro 6 SSR (`@astrojs/node`) + Drizzle ORM + Astro Actions, multi-tenant (blog global **et** blog par organisation)
> **Statut** : ✅ Intégré et tracké (`git` : commit `11b5c4a` *"add blog and fix things to be ready production v1"*), audit clôturé (`docs/blog/audit.md`, 30 findings traités)
> **Source de vérité** : code live vérifié (`git status`, `git log`, arborescence `src/`), pas la mémoire projet antérieure (2026-07-05) qui décrivait un état non tracké et partiellement cassé — **désormais dépassée**.

---

## 1. Périmètre et architecture

Le module blog est un sous-système complet, multi-locales (fr/en/es/ar RTL) et multi-tenant (global + par organisation Better Auth). Il couvre : articles, catégories, tags, commentaires (modérés), avis/notes, réactions, favoris, signalements, galeries, liens internes, abonnements newsletter (double opt-in), vues/analytics, SEO par locale, et administration (globale + org).

### 1.1 Arborescence (vérifiée)

| Domaine | Chemin |
| ------- | ------ |
| Actions (Astro Actions) | `src/actions/blog/` — 18 fichiers (`post`, `category`, `tag`, `comment`, `review`, `reaction`, `moderation`, `report`, `favorite`, `gallery`, `link`, `internal-link`, `check-links`, `subscription`, `notification`, `view`, `profile`, `_helpers`) |
| Schéma DB | `src/database/schemas/blog.schema.ts` — 30 tables métier + 30 tables de relations Drizzle |
| Loaders | `src/database/loaders/blog.loader.ts` (~1150 lignes) |
| Lib | `src/lib/blog/` — `constants`, `types`, `utils`, `validation`, `blog-internal-link` |
| Composants | `src/components/blog/` — cartes, grilles, sidebars, formulaires commentaires/avis, `ReactionBar`, `AuthorCard`, `PostContent`, admin (`AdminPostList`, `AdminPostForm`) |
| Pages publiques | `src/pages/[lang]/blog/index.astro`, `[...slug].astro` |
| Pages organisation | `src/pages/[lang]/organizations/[slug]/blog/{index,[...blog],rss.xml}.astro` |
| Admin | `src/pages/[lang]/admin/blog/{index,new,[id]/edit}.astro` + équivalent org |
| API | `src/pages/api/blog/newsletter/{confirm,unsubscribe}.ts` |
| SEO | `src/pages/sitemap-blog-org.xml.ts`, `src/pages/rss.xml.ts` (global + org) |
| i18n | `src/i18n/blog/{fr,en,es,ar}.ts` |

### 1.2 Modèle de données (30 tables)

`blogPosts`, `blogPostTranslations`, `blogCategories`, `blogCategoryTranslations`, `blogTags`, `blogTagTranslations`, `blogPostCategories`, `blogPostTags`, `blogComments`, `blogCommentModerations`, `blogPostRevisions`, `blogPostGalleries`, `blogPostGalleryMedia`, `blogPostReviews`, `blogPostReviewHelpful`, `blogReports`, `blogPostFavorites`, `blogPostReactions`, `blogPostSeo`, `blogPostViewStats`, `blogNotifications`, `blogPostLocks`, `blogPostLinks`, `blogSubscribers`, `blogPostsRelations`, et tables de relations Drizzle pour chaque entité ci-dessus.

---

## 2. Tests et qualité

| Couche | Fichiers | Détail |
| ------ | -------- | ------ |
| Unit | **9** | `blog-helpers`, `blog-post-actions`, `blog-taxonomy-actions`, `blog-engagement-actions`, `blog-gallery`, `blog-link`, `blog-loader`, `blog-profile`, `blog-subscription` |
| Intégration | **2** | `blog-actions` (incl. `recordBlogPostView` sur vraie DB de test), `blog-internal-link` |
| E2E | **1** | `tests/e2e/blog.spec.ts` |
| Total suite | 1155/1155 (réf. audit clôturé) | |

Gates CI : `pnpm check` (typage strict, 0 erreur), `pnpm lint` (0 erreur blog), `pnpm test` vert.

---

## 3. Sécurité et gouvernance (audit clôturé — 30 findings)

Points clés résolus et vérifiés sur le code live :

- **Rate-limit** sur soumission newsletter (`subscription.ts` : `newsletter-subscribe`/`confirm`/`unsubscribe`) et sur les actions publiques d'engagement.
- **Sanitization** : `sanitizeHtml` appliqué à `content`, `guestName`, `guestEmail` (commentaires invités) ; politique de liens force `rel="noopener noreferrer"`.
- **Gouvernance multi-tenant** : `assertBlogPermission` (`_helpers.ts`) — l'admin global est délibérément global ; un admin peut cibler toute organisation via `input.organizationId` client-supplied (décision documentée, pas un bypass).
- **Visiteur anonyme** : cookie `atomic_visitor` (httpOnly, 1 an, sameSite lax) + repli `anon:<uuid>` pour le tracking de vues.
- **Index d'unicité partiels** par `(org|global, locale, slug)` sur posts/catégories/tags (migration 0021) — empêche les collisions de slug localisés.
- **Locks** : `publishedScope` ignore les locks expirés (>15 min) pour ne pas cacher indéfiniment un post publié.
- **Audit** : `auditBlog` sur réactions/favoris/vues ; `getCacheStats()` exposé via `api/health.ts` (token auth).

---

## 4. SEO & découvrabilité

- **Sitemap** : `sitemap-blog-org.xml.ts` (organisations) + intégration blog dans `rss.xml.ts` global et `rss.xml.ts` par org, par locale (`buildBlogPostUrl(loc, ...)` par item).
- **Slugs i18n** : URLs directes localisées — listing `/{lang}/blog/{categorySlug}`, détail `/{lang}/blog/{categorySlug}/{postSlug}` ; redirections depuis l'ancienne forme `/categories/{slug}`.
- **Recherche sitewide** : `src/pages/api/search.ts` inclut désormais le blog (vérifié `True` sur le code live) — comblant le gap SEO identifié en 2026-07-05.
- **Métadonnées par post** : meta title/description, OG, Twitter Cards, JSON-LD `BlogPosting`/`Breadcrumb`.

---

## 5. Points ouverts de la mémoire projet (2026-07-05) — RÉSOLUS

La mémoire projet antérieure listait des gaps. Vérifiés sur le code live le 2026-07-18, ils sont **tous clos** :

| Gap mémoire (2026-07-05) | État live (2026-07-18) |
| ------------------------ | ---------------------- |
| Newsletter sans backend (`action="#"`) | ✅ Double opt-in complet (`blogSubscribers`, token de confirmation, `confirm`/`unsubscribe` API) |
| `blogPostViewStats` jamais écrit / `viewCount` inert | ✅ `recordBlogPostView` incrémente `viewCount` + écrit `blogPostViewStats` |
| Author profile page 100% unreachable | ✅ Retiré de l'arbo (aucune route `author` restante) |
| Blog absent de sitemap/RSS/search | ✅ Présent dans sitemap-org, RSS global+org, et `api/search.ts` |
| Module non tracké en git | ✅ Tracké (commit `11b5c4a`), tous fichiers `M`/committés |
| 17 erreurs TS `pnpm check` dans blog | ✅ 0 erreur (audit clôturé) |

---

## 6. Recommandations (suivi, non bloquant)

1. **Mettre à jour `/memories/repo/atomic-project-status.md`** — la section "Blog module notes" (2026-07-04/05) décrit un état dépassé (non tracké, gaps ouverts). À remplacer par l'état consolidé ci-dessus pour ne pas fausser de futurs audits.
2. **Couverture CI a11y/perf** — `.pa11yci.cjs` et `lighthouserc.cjs` ne listent pas d'URLs `/blog` (listing, détail, admin). Le module échappe aux gates WCAG-AAA / Lighthouse. À ajouter pour aligner avec le reste du site.
3. **`blogPostLinks` (curation RELATED/PREV/NEXT)** — table présente au schéma mais sans action ni loader dédié ; le "related posts" utilise l'algorithme automatique par catégorie/tag (`getRelatedBlogPosts`). À confirmer si la curation manuelle est un besoin réel ou à retirer.
4. **`blogNotifications`** — écrites (nouveau commentaire/avis/résultat modération) mais sans UI de lecture (pas d'inbox/bell, pas de `getBlogNotifications`). Table write-only ; à brancher ou à documenter comme intentionnel.

---

## 7. Conclusion

Le module blog est **en état de production** : tracké en git, typé strict, lint-clean, testé (unit + intégration + E2E), sécurisé (rate-limit, sanitization, gouvernance multi-tenant, audit), et découvrable (sitemap, RSS, search, SEO par locale). L'audit `docs/blog/audit.md` (30 findings) est la référence des corrections appliquées. Les seuls points restants sont des recommandations de suivi (CI a11y/perf sur blog, tables `blogPostLinks`/`blogNotifications` à clarifier) — aucun bloquant.

> **Action requise** : mettre à jour la mémoire projet (point 6.1) pour refléter cet état et éviter la pérennisation de faits obsolètes.
