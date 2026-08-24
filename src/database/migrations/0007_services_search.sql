ALTER TABLE "service_translations" ADD COLUMN "search_vector" tsvector;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION refresh_service_translation_search_vector() RETURNS trigger AS $$
DECLARE
  cfg regconfig;
BEGIN
  cfg := locale_to_regconfig(NEW.locale);
  NEW.search_vector :=
    setweight(to_tsvector(cfg, coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector(cfg, coalesce(NEW.meta_title, '') || ' ' || coalesce(NEW.meta_description, '') || ' ' || coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector(cfg, regexp_replace(coalesce(NEW.slug, ''), '-', ' ', 'g')), 'C') ||
    setweight(to_tsvector(cfg, regexp_replace(coalesce(NEW.content, ''), '<[^>]+>', ' ', 'g')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER service_translations_search_vector_update
  BEFORE INSERT OR UPDATE OF title, slug, excerpt, meta_title, meta_description, content, locale
  ON service_translations
  FOR EACH ROW
  EXECUTE FUNCTION refresh_service_translation_search_vector();
--> statement-breakpoint
UPDATE service_translations SET search_vector =
  setweight(to_tsvector(locale_to_regconfig(locale), coalesce(title, '')), 'A') ||
  setweight(to_tsvector(locale_to_regconfig(locale), coalesce(meta_title, '') || ' ' || coalesce(meta_description, '') || ' ' || coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector(locale_to_regconfig(locale), regexp_replace(coalesce(slug, ''), '-', ' ', 'g')), 'C') ||
  setweight(to_tsvector(locale_to_regconfig(locale), regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g')), 'D');
--> statement-breakpoint
CREATE INDEX "service_translations_search_vector_gin_idx" ON "service_translations" USING GIN ("search_vector");
