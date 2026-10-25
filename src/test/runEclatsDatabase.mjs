// Isolated PostgreSQL engine: invoke with PGLITE_PACKAGE pointing to an installed package.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_PACKAGE).href);
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
CREATE TABLE public.animals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,scientific_name text,created_at timestamptz DEFAULT now());
CREATE TABLE public.captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,image_url text,animal_name text,scientific_name text,status text DEFAULT 'approved',xp_awarded boolean DEFAULT false,created_at timestamptz DEFAULT now());
CREATE FUNCTION public.normalize_animal_label(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT lower(btrim($1)) $$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
INSERT INTO public.animals(name,scientific_name) VALUES('Renard roux','Vulpes vulpes'),('Mésange bleue','Cyanistes caeruleus');
`);
for (const file of ['drizzle/migrations/0058_explorer_eclats_foundation.sql', 'drizzle/migrations/0059_atomic_eclats_validation.sql']) await db.exec(readFileSync(file, 'utf8'));
await db.exec(readFileSync('src/test/eclats.integration.sql', 'utf8'));
console.log('Éclats ledger, UTC, anti-duplicate, reversal and access tests passed');
await db.exec(readFileSync('drizzle/migrations/0060_eclats_lessons_only.sql', 'utf8'));
await db.exec(readFileSync('src/test/eclatsLessonsOnly.integration.sql', 'utf8'));
console.log('Lessons-only: activity, captures and discoveries award zero, even with legacy positive settings');
await db.close();