
-- 1. Fix profiles SELECT: restrict to authenticated only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Fix explorer_friends: remove overly permissive accepted policy
DROP POLICY IF EXISTS "Authenticated can view accepted relations" ON public.explorer_friends;

-- 3. Fix captures storage: add folder ownership to INSERT
DROP POLICY IF EXISTS "Authenticated users can upload capture images" ON storage.objects;
CREATE POLICY "Users can upload to own captures folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'captures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Fix mutable search_path on email queue functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT pgmq.send(queue_name, payload); $$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT pgmq.delete(queue_name, message_id); $$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$$;
