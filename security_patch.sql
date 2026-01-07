/*
  Security Patch for Habit Tracer
  ------------------------------------------------------------------
  INSTRUCTIONS:
  1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/neypfhozsywupsxxetvv/sql/new
  2. Paste this entire script into the SQL Editor.
  3. Click "Run".
  
  WHAT THIS DOES:
  1. Enables Row Level Security (RLS) on all application tables.
  2. Creates a default "Restrict all access" policy for each table.
     - This blocks all public API access (via the `anon` key).
     - Your Prisma backend (which uses the connection string) will still have full access.
*/

DO $$
DECLARE
  t text;
BEGIN
  -- Loop through all tables in the public schema, excluding internal migration tables
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('_prisma_migrations') 
  LOOP
    -- 1. Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    
    -- 2. Drop existing policy if it exists (to avoid duplicate errors)
    EXECUTE format('DROP POLICY IF EXISTS "Restrict all access" ON %I;', t);
    
    -- 3. Create the new restrictive policy
    -- This policy returns 'false' for all operations, effectively blocking access via the API
    EXECUTE format('CREATE POLICY "Restrict all access" ON %I FOR ALL TO anon, authenticated USING (false);', t);
    
    RAISE NOTICE 'Secured table: %', t;
  END LOOP;
END $$;
