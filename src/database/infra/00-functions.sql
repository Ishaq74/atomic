-- Fonctions utilitaires pour l'infrastructure DB.
-- current_user_id() et is_admin() lisent le contexte applicatif
-- posé par withDbActorContext() (src/database/drizzle.ts).
-- LANGUAGE sql : inlinable par le query planner, pas de subtransaction.
-- PARALLEL SAFE : utilisable dans les workers parallèles (pas d'EXCEPTION).

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY INVOKER
AS $$
    SELECT nullif(current_setting('app.current_user_id', true), '');
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY INVOKER
AS $$
    SELECT coalesce(current_setting('app.is_admin', true)::boolean, false);
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
