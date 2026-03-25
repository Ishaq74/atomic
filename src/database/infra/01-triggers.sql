-- Triggers updated_at automatiques.
-- Idempotent : vérifie l'existence de chaque table (to_regclass) ET l'absence du trigger.
-- Tolérant base vide : si une table n'existe pas encore, le trigger est ignoré silencieusement.
-- Requiert : update_updated_at_column() définie dans 00-functions.sql.

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('"user"',            'trigger_user_updated_at'),
            ('organization',      'trigger_organization_updated_at'),
            ('navigation_menus',  'trigger_navigation_menus_updated_at'),
            ('navigation_items',  'trigger_navigation_items_updated_at'),
            ('pages',             'trigger_pages_updated_at'),
            ('page_sections',     'trigger_page_sections_updated_at'),
            ('site_settings',     'trigger_site_settings_updated_at'),
            ('social_links',      'trigger_social_links_updated_at'),
            ('contact_info',      'trigger_contact_info_updated_at'),
            ('opening_hours',     'trigger_opening_hours_updated_at'),
            ('theme_settings',    'trigger_theme_settings_updated_at')
        ) AS t(tbl, trig)
    LOOP
        IF to_regclass(r.tbl) IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = r.trig)
        THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                r.trig, r.tbl
            );
            RAISE NOTICE 'trigger % créé sur %', r.trig, r.tbl;
        END IF;
    END LOOP;
END $$;
