ALTER TABLE "service_translations" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION atomic_services_translation_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_vector" := to_tsvector(
    CASE NEW."locale"
      WHEN 'fr' THEN 'french'::regconfig
      WHEN 'es' THEN 'spanish'::regconfig
      WHEN 'en' THEN 'english'::regconfig
      WHEN 'ar' THEN 'simple'::regconfig
      ELSE 'simple'::regconfig
    END,
    concat_ws(' ', NEW."title", NEW."excerpt", NEW."content", NEW."meta_title", NEW."meta_description")
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_translation_search_vector_trigger ON "service_translations";
CREATE TRIGGER services_translation_search_vector_trigger
BEFORE INSERT OR UPDATE OF "locale", "title", "excerpt", "content", "meta_title", "meta_description"
ON "service_translations"
FOR EACH ROW
EXECUTE FUNCTION atomic_services_translation_search_vector_update();

UPDATE "service_translations"
SET "search_vector" = to_tsvector(
  CASE "locale"
    WHEN 'fr' THEN 'french'::regconfig
    WHEN 'es' THEN 'spanish'::regconfig
    WHEN 'en' THEN 'english'::regconfig
    WHEN 'ar' THEN 'simple'::regconfig
    ELSE 'simple'::regconfig
  END,
  concat_ws(' ', "title", "excerpt", "content", "meta_title", "meta_description")
);

CREATE INDEX IF NOT EXISTS "service_translations_search_vector_gin_idx"
ON "service_translations" USING GIN ("search_vector");
