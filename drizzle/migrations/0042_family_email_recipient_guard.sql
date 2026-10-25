CREATE OR REPLACE FUNCTION public.create_family_email_invitation(p_user uuid,p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE f public.families; token text; invitation uuid; v_email text:=lower(trim(p_email));
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF v_email IS NULL OR length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
 SELECT * INTO f FROM public.families WHERE owner_id=p_user AND closed_at IS NULL AND id IN (SELECT family_id FROM public.family_memberships WHERE user_id=p_user AND left_at IS NULL) FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'owner_required'; END IF;
 IF NOT public.family_valid(f.id) THEN RAISE EXCEPTION 'family_expired'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u JOIN public.family_memberships m ON m.user_id=u.id WHERE lower(u.email)=v_email AND m.family_id=f.id AND m.left_at IS NULL) THEN RAISE EXCEPTION 'already_in_family'; END IF;
 UPDATE public.family_invitations SET revoked_at=now() WHERE family_id=f.id AND recipient_email=v_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now();
 IF EXISTS(SELECT 1 FROM public.family_invitations WHERE family_id=f.id AND recipient_email=v_email AND revoked_at IS NULL AND accepted_at IS NULL) THEN RAISE EXCEPTION 'invitation_pending'; END IF;
 IF (SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'invite_rate_limit'; END IF;
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=f.id AND left_at IS NULL)+(SELECT count(*) FROM public.family_invitations WHERE family_id=f.id AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at>now())>=4 THEN RAISE EXCEPTION 'family_full'; END IF;
 token:=encode(gen_random_bytes(32),'hex');
 INSERT INTO public.family_invitations(family_id,token_hash,recipient_email) VALUES(f.id,encode(digest(token,'sha256'),'hex'),v_email) RETURNING id INTO invitation;
 RETURN jsonb_build_object('id',invitation,'token',token,'email',v_email);
END $$;
REVOKE ALL ON FUNCTION public.create_family_email_invitation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_email_invitation(uuid,text) TO service_role;