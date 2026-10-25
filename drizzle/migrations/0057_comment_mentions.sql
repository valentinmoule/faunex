CREATE OR REPLACE FUNCTION public.comment_mention_recipients(p_capture_id uuid, p_actor_id uuid, p_content text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT DISTINCT p.user_id
  FROM public.profiles p
  JOIN public.captures c ON c.id = p_capture_id
  JOIN LATERAL regexp_matches(p_content, '(^|[^[:alnum:]_@])@([[:alnum:]_.-]+)', 'g') m ON true
  WHERE lower(ltrim(p.username, '@')) = lower(rtrim(m[2], '.-'))
    AND p.user_id <> p_actor_id
    AND (p.user_id = c.user_id OR (c.status = 'approved' AND c.shared AND NOT public.is_profile_private(c.user_id)));
$function$;
REVOKE ALL ON FUNCTION public.comment_mention_recipients(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comment_mention_recipients(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, capture_id, comment_text)
  SELECT r.user_id, 'mention', NEW.user_id, NEW.capture_id, NEW.content
  FROM public.comment_mention_recipients(NEW.capture_id, NEW.user_id, NEW.content) r;

  INSERT INTO public.notifications (user_id, type, actor_id, capture_id, comment_text)
  SELECT c.user_id, 'comment', NEW.user_id, NEW.capture_id, NEW.content
  FROM public.captures c
  WHERE c.id = NEW.capture_id AND c.user_id <> NEW.user_id
    AND NOT EXISTS (SELECT 1 FROM public.comment_mention_recipients(NEW.capture_id, NEW.user_id, NEW.content) r WHERE r.user_id = c.user_id);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
