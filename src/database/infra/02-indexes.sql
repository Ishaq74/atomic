-- Indexes complémentaires aux indexes Drizzle.
-- audit_log n'a aucun index dédié dans le schéma TS : on couvre les requêtes courantes.

CREATE INDEX IF NOT EXISTS audit_log_user_created_at_idx
ON audit_log (user_id, created_at DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS audit_log_action_created_at_idx
ON audit_log (action, created_at DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS audit_log_resource_created_at_idx
ON audit_log (resource, resource_id, created_at DESC);
--> statement-breakpoint

-- Complète nav_items_menu_locale_idx (Drizzle) en ajoutant is_active
-- pour couvrir les requêtes filtrées sur les items actifs uniquement.
-- (pages_locale_slug_active_idx supprimé : redondant avec pages_locale_slug_uidx + pages_locale_published_idx)
CREATE INDEX IF NOT EXISTS navigation_items_menu_locale_active_sort_idx
ON navigation_items (menu_id, locale, is_active, sort_order);
--> statement-breakpoint

-- ─── Full-Text Search column + GIN index ─────────────────────────────────────
-- tsvector column managed by triggers, NOT by Drizzle ORM.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS search_vector tsvector;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS pages_search_vector_idx
ON pages USING GIN (search_vector);
--> statement-breakpoint

-- Same pattern for blog post translations (see 00-functions.sql / 01-triggers.sql).
ALTER TABLE blog_post_translations ADD COLUMN IF NOT EXISTS search_vector tsvector;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS blog_post_translations_search_vector_idx
ON blog_post_translations USING GIN (search_vector);
--> statement-breakpoint

-- One-time backfill for rows inserted before the trigger existed (no-op SET
-- fires the `OF title` trigger, which recomputes search_vector from all fields).
UPDATE blog_post_translations SET title = title WHERE search_vector IS NULL;
