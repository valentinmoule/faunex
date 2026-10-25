CREATE TABLE public.family_checkout_intents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,price_id text NOT NULL CHECK(price_id IN ('faunex_premium_family_yearly','faunex_premium_family_monthly')),environment text NOT NULL CHECK(environment IN ('live','sandbox')),created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour',subscription_id text UNIQUE);
GRANT ALL ON public.family_checkout_intents TO service_role;
ALTER TABLE public.family_checkout_intents ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.family_checkout_guard(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,42));
 IF EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=p_user AND left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 IF public.has_active_subscription(p_user,'live') THEN RAISE EXCEPTION 'individual_subscription_active'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.family_checkout_guard(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.family_checkout_guard(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.revoke_family_invitation(p_invitation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE f uuid; BEGIN
 SELECT family_id INTO f FROM public.family_invitations WHERE id=p_invitation;
 PERFORM 1 FROM public.families WHERE id=f AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_authorized'; END IF;
 UPDATE public.family_invitations SET revoked_at=now() WHERE id=p_invitation AND accepted_at IS NULL;
END $$;