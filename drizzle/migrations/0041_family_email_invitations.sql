ALTER TABLE public.family_invitations ADD COLUMN recipient_email text;
CREATE UNIQUE INDEX family_pending_email_unique ON public.family_invitations(family_id,recipient_email) WHERE recipient_email IS NOT NULL AND revoked_at IS NULL AND accepted_at IS NULL;
CREATE OR REPLACE FUNCTION public.create_family_email_invitation(p_user uuid,p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE f public.families; token text; invitation uuid; email text:=lower(trim(p_email));
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF email IS NULL OR length(email)>254 OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
 SELECT * INTO f FROM public.families WHERE owner_id=p_user AND closed_at IS NULL AND public.in_my_family(id) FOR UPDATE;
 -- Service calls have no user JWT; ownership is supplied only by the verified server caller.
 IF f.id IS NULL THEN SELECT * INTO f FROM public.families WHERE owner_id=p_user AND closed_at IS NULL AND id IN (SELECT family_id FROM public.family_memberships WHERE user_id=p_user AND left_at IS NULL) FOR UPDATE; END IF;
 IF f.id IS NULL THEN RAISE EXCEPTION 'owner_required'; END IF;
 IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u JOIN public.family_memberships m ON m.user_id=u.id WHERE lower(u.email)=email AND m.family_id=f.id AND m.left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 UPDATE public.family_invitations SET revoked_at=now() WHERE family_id=f.id AND recipient_email=email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now();
 IF EXISTS(SELECT 1 FROM public.family_invitations WHERE family_id=f.id AND recipient_email=email AND revoked_at IS NULL AND accepted_at IS NULL) THEN RAISE EXCEPTION 'invitation_pending'; END IF;
 IF (SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'invite_rate_limit'; END IF;
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=f.id AND left_at IS NULL)+(SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at>now())>=4 THEN RAISE EXCEPTION 'family_full'; END IF;
 token:=encode(gen_random_bytes(32),'hex');
 INSERT INTO public.family_invitations(family_id,token_hash,recipient_email) VALUES(f.id,encode(digest(token,'sha256'),'hex'),email) RETURNING id INTO invitation;
 RETURN jsonb_build_object('id',invitation,'token',token,'email',email);
END $$;
REVOKE ALL ON FUNCTION public.create_family_email_invitation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_email_invitation(uuid,text) TO service_role;
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
 IF i.recipient_email IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)=i.recipient_email AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'invitation_email_mismatch'; END IF;
 IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 IF EXISTS(SELECT 1 FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=f.id AND left_at IS NULL)>=4 THEN RAISE EXCEPTION 'family_full'; END IF;
 INSERT INTO public.family_memberships(family_id,user_id) VALUES(f.id,auth.uid());
 UPDATE public.family_invitations SET accepted_at=now() WHERE id=i.id;
 RETURN f.id;
END $$;
CREATE OR REPLACE FUNCTION public.my_family() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.families;
BEGIN
 SELECT * INTO f FROM public.families WHERE id IN (SELECT family_id FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL);
 IF f.id IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',f.id,'owner_id',f.owner_id,'active',public.family_valid(f.id),'environment',f.environment,'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(p.display_name,p.username,'Faunex'),'username',p.username)) FROM public.family_memberships m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.family_id=f.id AND m.left_at IS NULL),'[]'::jsonb),'invitations',CASE WHEN f.owner_id=auth.uid() THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'expires_at',expires_at,'recipient_email',recipient_email)) FROM public.family_invitations WHERE family_id=f.id AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;