ALTER TABLE "service_translations"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "atomic_service_translation_search_vector"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."excerpt", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."content", '')), 'C');
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "atomic_service_translation_search_vector_trg"
  ON "service_translations";
--> statement-breakpoint

CREATE TRIGGER "atomic_service_translation_search_vector_trg"
BEFORE INSERT OR UPDATE OF "title", "excerpt", "content"
ON "service_translations"
FOR EACH ROW
EXECUTE FUNCTION "atomic_service_translation_search_vector"();
--> statement-breakpoint

UPDATE "service_translations"
SET "search_vector" =
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', coalesce("excerpt", '')), 'B') ||
  setweight(to_tsvector('simple', coalesce("content", '')), 'C');
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "service_translations_search_vector_gin_idx"
  ON "service_translations"
  USING gin ("search_vector");
