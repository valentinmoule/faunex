CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, subscription_id uuid NOT NULL REFERENCES public.subscriptions(id), environment text NOT NULL CHECK(environment IN ('live','sandbox')), created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz, UNIQUE(subscription_id));
GRANT SELECT ON public.families TO authenticated; GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.family_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id uuid NOT NULL REFERENCES public.families(id), user_id uuid NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(), left_at timestamptz);
GRANT SELECT ON public.family_memberships TO authenticated; GRANT ALL ON public.family_memberships TO service_role;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX one_current_family ON public.family_memberships(user_id) WHERE left_at IS NULL;
CREATE TABLE public.family_invitations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id uuid NOT NULL REFERENCES public.families(id), token_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', revoked_at timestamptz, accepted_at timestamptz);
GRANT SELECT ON public.family_invitations TO authenticated; GRANT ALL ON public.family_invitations TO service_role;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.in_my_family(p_family uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.family_memberships WHERE family_id=p_family AND user_id=auth.uid() AND left_at IS NULL); $$;
REVOKE ALL ON FUNCTION public.in_my_family(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.in_my_family(uuid) TO authenticated,service_role;
CREATE POLICY family_members_read ON public.families FOR SELECT TO authenticated USING(public.in_my_family(id));
CREATE POLICY family_memberships_read ON public.family_memberships FOR SELECT TO authenticated USING(public.in_my_family(family_id));
CREATE POLICY family_invites_owner_read ON public.family_invitations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.families f WHERE f.id=family_id AND f.owner_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.family_valid(p_family uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.families f JOIN public.subscriptions s ON s.id=f.subscription_id WHERE f.id=p_family AND f.closed_at IS NULL AND s.user_id=f.owner_id AND s.environment=f.environment AND s.price_id IN ('faunex_premium_family_yearly','faunex_premium_family_monthly') AND ((s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status IN ('paused','past_due','canceled') AND s.current_period_end>now()) OR EXISTS(SELECT 1 FROM public.referral_rewards r WHERE r.user_id=f.owner_id AND r.environment=f.environment AND r.billing_subscription_id=s.paddle_subscription_id AND r.starts_at<=now() AND r.ends_at>now())));
$$;
REVOKE ALL ON FUNCTION public.family_valid(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.family_valid(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.ensure_paid_family(p_subscription uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; f uuid;
BEGIN
 SELECT * INTO s FROM public.subscriptions WHERE id=p_subscription FOR UPDATE;
 IF s.id IS NULL OR s.price_id NOT IN ('faunex_premium_family_yearly','faunex_premium_family_monthly') OR s.status NOT IN ('active','trialing') THEN RAISE EXCEPTION 'family_payment_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s.user_id::text,42));
 SELECT id INTO f FROM public.families WHERE subscription_id=s.id;
 IF f IS NOT NULL THEN RETURN f; END IF;
 IF EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=s.user_id AND left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 INSERT INTO public.families(owner_id,subscription_id,environment) VALUES(s.user_id,s.id,s.environment) RETURNING id INTO f;
 INSERT INTO public.family_memberships(family_id,user_id) VALUES(f,s.user_id);
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.ensure_paid_family(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.ensure_paid_family(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.create_family_invitation() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE f public.families; token text; seats integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 SELECT * INTO f FROM public.families WHERE owner_id=auth.uid() AND closed_at IS NULL AND id IN (SELECT family_id FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL) FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'owner_required'; END IF;
 IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
 SELECT (SELECT count(*) FROM public.family_memberships WHERE family_id=f.id AND left_at IS NULL)+(SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at>now()) INTO seats;
 IF seats>=4 THEN RAISE EXCEPTION 'family_full'; END IF;
 IF (SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'invite_rate_limit'; END IF;
 token:=encode(gen_random_bytes(32),'hex');
 INSERT INTO public.family_invitations(family_id,token_hash) VALUES(f.id,encode(digest(token,'sha256'),'hex'));
 RETURN token;
END $$;
CREATE OR REPLACE FUNCTION public.accept_family_invitation(p_token text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE i public.family_invitations; f public.families;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 SELECT * INTO i FROM public.family_invitations WHERE token_hash=encode(digest(p_token,'sha256'),'hex');
 IF i.id IS NULL THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 SELECT * INTO f FROM public.families WHERE id=i.family_id FOR UPDATE;
 SELECT * INTO i FROM public.family_invitations WHERE id=i.id FOR UPDATE;
 IF i.revoked_at IS NOT NULL OR i.accepted_at IS NOT NULL OR i.expires_at<=now() THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 IF EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=f.id AND left_at IS NULL)>=4 THEN RAISE EXCEPTION 'family_full'; END IF;
 INSERT INTO public.family_memberships(family_id,user_id) VALUES(f.id,auth.uid());
 UPDATE public.family_invitations SET accepted_at=now() WHERE id=i.id;
 RETURN f.id;
END $$;
CREATE OR REPLACE FUNCTION public.remove_family_member(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.families;
BEGIN
 SELECT * INTO f FROM public.families WHERE id IN (SELECT family_id FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL) FOR UPDATE;
 IF f.id IS NULL OR (f.owner_id<>auth.uid() AND p_user<>auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF p_user=f.owner_id THEN RAISE EXCEPTION 'cannot_remove_owner'; END IF;
 UPDATE public.family_memberships SET left_at=now() WHERE family_id=f.id AND user_id=p_user AND left_at IS NULL;
END $$;
CREATE OR REPLACE FUNCTION public.revoke_family_invitation(p_invitation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.family_invitations i SET revoked_at=now() FROM public.families f WHERE i.id=p_invitation AND i.family_id=f.id AND f.owner_id=auth.uid() AND i.accepted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_authorized'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_family_invitation(),public.accept_family_invitation(text),public.remove_family_member(uuid),public.revoke_family_invitation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_family_invitation(),public.accept_family_invitation(text),public.remove_family_member(uuid),public.revoke_family_invitation(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid,check_env text DEFAULT 'live') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=user_uuid AND environment=check_env AND ((status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end>now())) OR (status IN ('paused','past_due','canceled') AND current_period_end>now())))
 OR EXISTS(SELECT 1 FROM public.referral_rewards WHERE user_id=user_uuid AND environment=check_env AND starts_at<=now() AND ends_at>now())
 OR EXISTS(SELECT 1 FROM public.family_memberships m JOIN public.families f ON f.id=m.family_id WHERE m.user_id=user_uuid AND m.left_at IS NULL AND f.environment=check_env AND public.family_valid(f.id));
$$;
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_active_subscription(p_user_id,'live'); $$;
CREATE OR REPLACE FUNCTION public.my_family() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.families; result jsonb;
BEGIN
 SELECT * INTO f FROM public.families WHERE id IN (SELECT family_id FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL);
 IF f.id IS NULL THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('id',f.id,'owner_id',f.owner_id,'active',public.family_valid(f.id),'environment',f.environment,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(p.display_name,p.username,'Faunex'),'username',p.username)) FROM public.family_memberships m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.family_id=f.id AND m.left_at IS NULL),'[]'::jsonb),'invitations',CASE WHEN f.owner_id=auth.uid() THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'expires_at',expires_at)) FROM public.family_invitations WHERE family_id=f.id AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()),'[]'::jsonb) ELSE '[]'::jsonb END) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.my_premium_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_active_subscription(auth.uid(),'live'); $$;
REVOKE ALL ON FUNCTION public.my_family(),public.my_premium_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_family(),public.my_premium_access() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.close_deleted_family_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.families SET closed_at=now() WHERE owner_id=OLD.user_id AND closed_at IS NULL;
 UPDATE public.family_memberships SET left_at=now() WHERE left_at IS NULL AND (user_id=OLD.user_id OR family_id IN(SELECT id FROM public.families WHERE owner_id=OLD.user_id));
 UPDATE public.family_invitations SET revoked_at=now() WHERE revoked_at IS NULL AND family_id IN(SELECT id FROM public.families WHERE owner_id=OLD.user_id);
 RETURN OLD; END $$;
CREATE TRIGGER close_family_on_profile_delete AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.close_deleted_family_owner();