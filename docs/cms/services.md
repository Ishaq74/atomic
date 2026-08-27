# Services CMS — Architecture & Référence

## Positionnement

`Services` est le deuxième module métier complet du CMS Atomic après `Blog`. Il sert de validation architecturale : le domaine est suffisamment différent du Blog pour démontrer que les contrats CMS/Admin sont réellement réutilisables.

Services consomme les mêmes fondations de module, présentation, contenu, média, localisation, SEO, taxonomie, recherche, publication, révision, lock, engagement, modération, notification, audit et cache. Il ne crée pas un second CMS.

## Structure du module

```text
src/modules/services/
├── admin/
├── actions/
├── components/
│   ├── cards/
│   ├── lists/
│   ├── single/
│   └── ui/
├── domain/
├── i18n/
├── loaders/
├── permissions/
├── schema/
├── search/
├── seo/
├── utils/
├── validation/
├── capabilities.ts
├── module.ts
└── workflow.ts
```

La grammaire de présentation est commune à tous les modules :

```text
cards/
lists/
single/
ui/
```

Les variantes (`default`, `compact`, `featured`, `horizontal`, `dense`, `search`) modifient uniquement la représentation. Les composants utilisent les primitives du design system Atomic.

## Domaine

Le service possède un modèle fortement typé couvrant :

- `providerId` vers l'identité utilisateur canonique;
- statut éditorial `DRAFT`, `PUBLISHED`, `ARCHIVED`, `DELETED`;
- prix en unités mineures et devise à trois lettres;
- durée positive;
- capacité maximale;
- disponibilité mobile;
- mise en avant;
- vues et agrégats de notation;
- image de couverture;
- publication, création et mise à jour;
- verrouillage et auteur de dernière modification.

Les attributs configurables complètent le modèle ; ils ne remplacent pas les champs structurants.

## Schéma et données

Le module possède explicitement ses tables de domaine :

```text
services
service_translations
service_categories
service_category_translations
service_tags
service_tag_translations
service_category_links
service_tag_links
service_media
service_availability
service_revisions
service_locks
service_seo
service_favorites
service_reviews
service_review_helpful
service_comments
service_reports
service_view_stats
service_reactions
service_notifications
service_attribute_definitions
service_attribute_values
```

Les traductions restent `service × locale`, et les relations métier restent explicites. Aucun `entityType/entityId` générique n'est utilisé comme schéma principal.

## Localisation et URLs

Les locales Atomic sont :

```text
fr
en
es
ar
```

Les slugs sont localisés et soumis aux contraintes d'unicité du tenant et de la locale.

Les routes publiques sont :

```text
/{lang}/services
/{lang}/services/{categorySlug}
/{lang}/services/{categorySlug}/{slug}
/{lang}/organizations/{slug}/services
/{lang}/organizations/{slug}/services/{categorySlug}/{serviceSlug}
```

Une route avec catégorie ne doit pas afficher un service qui n'est pas rattaché à cette catégorie. Les URLs publiques utilisent les slugs localisés canoniques.

## Administration globale

```text
/{lang}/admin/services
/{lang}/admin/services/new
/{lang}/admin/services/{id}/edit
```

Le resource admin utilise le contrat partagé et expose recherche, statut, catégorie, tag, prestataire, mobile, locale, tri, pagination et statistiques globales.

Les statistiques sont calculées sur la totalité du tenant global et non sur la page affichée.

## Administration organisationnelle

```text
/{lang}/organizations/{slug}/admin/services
/{lang}/organizations/{slug}/admin/services/new
/{lang}/organizations/{slug}/admin/services/{id}/edit
```

Le même resource contract et les mêmes composants sont utilisés. Seul le contexte de tenant change.

L'organisation résolue à partir du slug est toujours recoupée avec les permissions Better Auth et avec l'ownership des ressources référencées.

## RBAC et tenancy

La chaîne de mutation est :

```text
validate
→ authorize
→ resolve tenant
→ check referenced-resource ownership
→ enforce business invariants
→ transaction
→ audit/event where applicable
→ cache invalidation
```

Un service ne peut pas référencer une catégorie, un tag ou un média d'un autre tenant. Les commentaires, avis, signalements et notifications sont également vérifiés dans le contexte du service et du tenant.

## Actions

Le module sépare les responsabilités :

```text
createService
updateService

publishService
unpublishService
archiveService
restoreService
deleteService
duplicateService
lockService
unlockService
listServiceRevisions
restoreServiceRevision

createServiceCategory
updateServiceCategory
deleteServiceCategory
createServiceTag
updateServiceTag
deleteServiceTag

addServiceMedia
updateServiceMedia
removeServiceMedia

createServiceAvailability
updateServiceAvailability
deleteServiceAvailability

createServiceAttributeDefinition
setServiceAttributeValue

createServiceComment
createServiceReview
createServiceReport
voteServiceReviewHelpful
toggleServiceFavorite
toggleServiceReaction

moderateServiceComment
moderateServiceReview
resolveServiceReport

recordServiceView

listServiceNotifications
markServiceNotificationRead
markAllServiceNotificationsRead
```

Les transitions de cycle de vie ne passent pas par `updateService`.

## Lifecycle

```text
DRAFT      → PUBLISHED | ARCHIVED | DELETED
PUBLISHED  → DRAFT | ARCHIVED | DELETED
ARCHIVED   → DRAFT | DELETED
DELETED    → DRAFT
```

`updateService` ne modifie ni le statut ni la date de publication. Chaque transition est validée explicitement.

Une restauration de révision respecte également la machine d'état et ajoute une nouvelle révision. L'historique existant n'est jamais réécrit.

## Duplication

`duplicateService` crée un nouvel objet `DRAFT` avec une nouvelle identité.

Copié :

```text
translations
categories
 tags
media
availability
SEO
content éditorial
```

Réinitialisé :

```text
id
slug canonique
status
publishedAt
viewCount
rating aggregates
favorites
reactions
comments
reviews
notifications
locks
analytics
revision history
```

La première révision du duplicata est une nouvelle révision de création.

## Taxonomie

Les catégories sont hiérarchiques. Les opérations de création et de mise à jour passent par l'invariant partagé d'acyclicité et refusent les parents d'un autre tenant.

La suppression d'une catégorie qui possède des enfants est refusée explicitement.

Les catégories et tags disposent de traductions par locale.

## Media et contenu

Services réutilise :

```text
mediaFiles
MediaPicker
ContentEditor
RichContent
internal-link resolver registry
sanitization
```

Les uploads et associations de média respectent les frontières de ownership du système Media partagé.

Le resolver interne utilisé par l'éditeur est `services`, pas `blog`.

## Disponibilité et attributs

Les disponibilités récurrentes utilisent :

```text
dayOfWeek
startTime
endTime
timezone
maxParticipants
```

La validation garantit des jours et horaires valides et un intervalle strictement positif.

Les attributs configurables utilisent des définitions typées (`STRING`, `NUMBER`, `BOOLEAN`, `SELECT`). Les valeurs sont liées au service et à la définition par une clé unique.

## SEO

Les métadonnées localisées restent dans `service_translations`. `service_seo` contient les données d'optimisation complémentaires et le score canonique du module.

Il ne doit pas exister plusieurs scores faisant autorité pour la même traduction.

## Engagement et modération

Services fournit :

```text
favorites
reactions
reviews
review helpful votes
comments
reports
moderation
notifications
```

Une réaction est unique par `(serviceId, userId)` ; changer de type remplace la réaction précédente.

Un signalement possède une cible unique : service, commentaire ou avis. Les cibles secondaires sont vérifiées contre le service avant écriture ou résolution.

Les avis approuvés alimentent les agrégats de rating du service.

## Notifications

Les notifications sont liées à un service et à leur cible sémantique. Les notifications de commentaire exigent leur `commentId` et les notifications d'avis leur `reviewId`.

Les requêtes de notification sont filtrées par destinataire **et par tenant via le service cible**.

Une notification auto-générée vers son propre acteur n'est pas créée.

## Analytics

Les vues sont enregistrées côté client via l'Action `recordServiceView` après vérification que le service est publié.

La protection repose sur un rate limit IP/service et le compteur `viewCount` est incrémenté atomiquement côté base.

## Search

Services déclare son propre `SearchResourceDefinition` :

```text
searchable
filterable
sortable
```

La définition couvre notamment titre, slug, contenu, extrait, statut, provider, catégorie, tag, mobile, featured, prix, rating, publication et vues.

Le module réutilise l'infrastructure Search Atomic et ne crée pas de moteur de recherche concurrent.

## Admin UX

Le formulaire d'édition partage le `AdminFormShell` et le dirty-state guard. L'édition conserve les catégories, tags, médias, SEO et contenu existants lorsqu'un champ non concerné est modifié.

Les opérations de publication, duplication, archivage, restauration, suppression, lock et unlock sont explicites et ne sont pas simulées par un update générique.

Les listes utilisent le Resource contract partagé et la même grammaire responsive que les autres modules.

## i18n et RTL

Toutes les chaînes de module vivent dans `src/modules/services/i18n/` pour `fr`, `en`, `es` et `ar`. L'Admin et les routes utilisent les mêmes codes de locale que la plateforme.

Le rendu arabe dépend du RTL partagé par Atomic ; Services n'introduit pas une logique RTL indépendante.

## Tests requis

La suite Services doit couvrir au minimum :

```text
module contract
admin resource compatibility
validation
lifecycle legal/illegal transitions
transactional create/update/duplicate
revision restore
locking
taxonomy cycle
cross-tenant resource references
media ownership
reaction replacement
single-target reports
notification target consistency
review aggregates
availability invariants
attribute validation
published-only public visibility
category/post URL consistency
global admin
organization admin
```

Les E2E doivent réutiliser la matrice `fr/en/es/ar` et les parcours de tenancy déjà établis pour le Blog lorsqu'ils sont communs.

## Architecture interdite

Services ne doit jamais introduire :

```text
service_media_engine
service_search_engine
service_workflow_engine
service_notification_engine
service_audit_engine
REST admin parallèle
localization JSONB concurrente
universal content table
```

Le module métier reste la combinaison de ses données, règles, présentation et administration. La plateforme reste responsable de l'infrastructure partagée.