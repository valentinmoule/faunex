CREATE OR REPLACE FUNCTION public.my_family() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.families; v_renews_at timestamptz; v_cancel boolean := false; v_grant_expires timestamptz;
BEGIN
 SELECT * INTO f FROM public.families WHERE id IN (SELECT family_id FROM public.family_memberships WHERE user_id=auth.uid() AND left_at IS NULL);
 IF f.id IS NULL THEN RETURN NULL; END IF;
 SELECT expires_at INTO v_grant_expires FROM public.family_complimentary_grants
  WHERE family_id=f.id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now());
 IF FOUND THEN
  v_renews_at := v_grant_expires;
 ELSE
  SELECT CASE WHEN s.current_period_end>now() THEN s.current_period_end END, COALESCE(s.cancel_at_period_end,false)
   INTO v_renews_at, v_cancel FROM public.subscriptions s WHERE s.id=f.subscription_id;
 END IF;
 RETURN jsonb_build_object('id',f.id,'owner_id',f.owner_id,'active',public.family_valid(f.id),'environment',f.environment,'renews_at',v_renews_at,'cancel_at_period_end',coalesce(v_cancel,false),'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(p.display_name,p.username,'Faunex'),'username',p.username)) FROM public.family_memberships m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.family_id=f.id AND m.left_at IS NULL),'[]'::jsonb),'invitations',CASE WHEN f.owner_id=auth.uid() THEN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'expires_at',expires_at,'recipient_email',recipient_email)) FROM public.family_invitations WHERE family_id=f.id AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;