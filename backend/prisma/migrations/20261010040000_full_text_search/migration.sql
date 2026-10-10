-- Busca textual em português, sem diferenciar acentos, com relevância (ts_rank).

-- A extensão fica sempre no schema public (é única por banco), mesmo quando a migração roda em outro schema.
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- unaccent() é STABLE; a versão IMMUTABLE pode ser usada em índices e no planejamento das consultas.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Vetor de busca: título pesa mais (A) que a descrição (B).
CREATE OR REPLACE FUNCTION f_search_vector(title text, description text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(title, ''))), 'A') ||
           setweight(to_tsvector('portuguese'::regconfig, f_unaccent(coalesce(description, ''))), 'B')
  $$;

-- Mantido por trigger (e não por coluna gerada) para o Prisma enxergar uma coluna comum.
CREATE OR REPLACE FUNCTION f_update_search_vector() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW."searchVector" := f_search_vector(NEW."title", NEW."description");
    RETURN NEW;
  END
  $$;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "searchVector" tsvector;
ALTER TABLE "Lesson" ADD COLUMN "searchVector" tsvector;

CREATE TRIGGER "Course_searchVector_update"
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Course"
  FOR EACH ROW EXECUTE FUNCTION f_update_search_vector();

CREATE TRIGGER "Lesson_searchVector_update"
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Lesson"
  FOR EACH ROW EXECUTE FUNCTION f_update_search_vector();

-- Preenche os registros existentes.
UPDATE "Course" SET "searchVector" = f_search_vector("title", "description");
UPDATE "Lesson" SET "searchVector" = f_search_vector("title", "description");

-- CreateIndex
CREATE INDEX "Course_searchVector_idx" ON "Course" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Lesson_searchVector_idx" ON "Lesson" USING GIN ("searchVector");
