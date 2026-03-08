
-- Function: notify on friend request (new row with status='pending')
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.addressee_id, 'friend_request', NEW.requester_id);
  RETURN NEW;
END;
$$;

-- Function: notify on friend request accepted (status updated to 'accepted')
CREATE OR REPLACE FUNCTION public.notify_on_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.requester_id, 'friend_accepted', NEW.addressee_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: on new friend request
CREATE TRIGGER on_friend_request
  AFTER INSERT ON public.explorer_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_friend_request();

-- Trigger: on friend request accepted
CREATE TRIGGER on_friend_accepted
  AFTER UPDATE ON public.explorer_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_friend_accepted();
