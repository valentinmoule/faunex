BEGIN;
DO $$
DECLARE fam uuid;
BEGIN
 SELECT f.id INTO fam FROM public.families f JOIN public.family_complimentary_grants g ON g.family_id=f.id WHERE f.owner_id='fb53d7d5-d325-4ac7-8ff9-b95637e5a561' AND g.expires_at IS NULL AND g.revoked_at IS NULL;
 IF fam IS NULL OR NOT public.family_valid(fam) THEN RAISE EXCEPTION 'lifetime_family_not_active'; END IF;
 IF (SELECT count(*) FROM public.family_memberships WHERE family_id=fam AND left_at IS NULL)<>1 THEN RAISE EXCEPTION 'owner_seat_missing'; END IF;
 IF has_table_privilege('authenticated','public.family_complimentary_grants','INSERT') THEN RAISE EXCEPTION 'client_can_grant_family'; END IF;
 UPDATE public.family_complimentary_grants SET revoked_at=now() WHERE family_id=fam;
 IF public.family_valid(fam) THEN RAISE EXCEPTION 'revoked_grant_still_active'; END IF;
 UPDATE public.family_complimentary_grants SET revoked_at=NULL,expires_at=now()-interval '1 second' WHERE family_id=fam;
 IF public.family_valid(fam) THEN RAISE EXCEPTION 'expired_grant_still_active'; END IF;
END $$;
ROLLBACK;