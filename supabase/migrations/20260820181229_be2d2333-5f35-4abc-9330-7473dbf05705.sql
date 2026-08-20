ALTER TABLE public.captures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captures;