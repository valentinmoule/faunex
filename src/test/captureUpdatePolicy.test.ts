// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

describe('Capture update policy without recursion', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = new PGlite({ fsBundle: new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob });
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $2 = current_setting('test.role',true) $$;
      CREATE TABLE public.captures(id uuid PRIMARY KEY,user_id uuid,status text,rarity text,note text,image_url text,correction_name text);
      INSERT INTO captures VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','pending_review','rare',NULL,'original.jpg','Renard roux');
      GRANT SELECT, UPDATE ON public.captures TO authenticated;
      ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
      CREATE POLICY reads ON captures FOR SELECT TO authenticated USING (user_id=auth.uid() OR has_role(auth.uid(),'admin'));
      CREATE POLICY "Admins can moderate captures" ON captures FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
      CREATE POLICY "Users can update own captures" ON captures FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (status=(SELECT c.status FROM captures c WHERE c.id=captures.id));
    `);
    await db.exec(readFileSync('drizzle/migrations/0080_fix_capture_update_policy_recursion.sql','utf8'));
  });
  afterEach(async () => { await db.close(); });
  const signIn = async (role: string, owner = false) => {
    await db.exec(`SET test.uid='00000000-0000-0000-0000-00000000000${owner ? '2' : '3'}'; SET test.role='${role}'; SET ROLE authenticated;`);
  };
  it('admin can approve a correction without recursion and preserves its photo', async () => {
    await signIn('admin');
    expect((await db.query(`UPDATE captures SET status='approved',correction_name=NULL RETURNING status,image_url,correction_name`)).rows).toEqual([{status:'approved',image_url:'original.jpg',correction_name:null}]);
  });
  it('owners can update personal notes without recursion', async () => {
    await signIn('user',true);
    expect((await db.query(`UPDATE captures SET note='Observation' RETURNING note`)).rows).toEqual([{note:'Observation'}]);
  });
  it.each(["status='approved'","rarity='hyper_rare'","user_id='00000000-0000-0000-0000-000000000003'"])( 'owner cannot change protected field %s', async (change) => {
    await signIn('user',true);
    await expect(db.query(`UPDATE captures SET ${change}`)).rejects.toMatchObject({code:'42501'});
  });
  it('another user cannot update the capture', async () => {
    await signIn('user');
    expect((await db.query(`UPDATE captures SET note='Not mine' RETURNING id`)).rows).toEqual([]);
  });
});