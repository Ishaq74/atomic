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
