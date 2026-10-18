CREATE OR REPLACE FUNCTION public.reward_city_match(p_name text,p_rule text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.reward_security_rules r,jsonb_array_elements_text(r.definition) k WHERE r.rule_key=p_rule AND strpos(public.reward_normalize(p_name),public.reward_normalize(k.value))>0) $$;
CREATE OR REPLACE FUNCTION public.reward_eligibility(p_badge_id text,p_timezone text DEFAULT 'Europe/Paris') RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); stats jsonb; rule jsonb; target integer; progress integer:=0; xp integer; k text; cat text; best_rank bigint; r bigint; total integer; captured integer; z public.user_department_subscriptions%ROWTYPE;
BEGIN
 IF u IS NULL OR p_badge_id IS NULL OR length(p_badge_id)>200 THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RETURN NULL; END IF;
 SELECT definition->p_badge_id INTO rule FROM public.reward_security_rules WHERE rule_key='badges';
 IF rule IS NOT NULL THEN
 target:=(rule->>0)::integer; xp:=(rule->>1)::integer;
 WITH own AS (SELECT DISTINCT ON (lower(animal_name)) * FROM public.captures WHERE user_id=u AND status='approved' ORDER BY lower(animal_name),created_at DESC,id)
 SELECT jsonb_build_object('total',count(*),'geo',count(*) FILTER(WHERE latitude IS NOT NULL),'rare',count(*) FILTER(WHERE rarity IN ('rare','very_rare','ultra_rare','illustration_rare','special_rare','hyper_rare','epic','legendary','mythic')),'silver',count(*) FILTER(WHERE rarity IN ('very_rare','ultra_rare','illustration_rare','epic','legendary')),'gold',count(*) FILTER(WHERE rarity IN ('special_rare','hyper_rare','mythic')),'night',coalesce(bool_or(extract(hour FROM created_at AT TIME ZONE p_timezone)>=21 OR extract(hour FROM created_at AT TIME ZONE p_timezone)<5),false),'early',coalesce(bool_or(extract(hour FROM created_at AT TIME ZONE p_timezone)>=5 AND extract(hour FROM created_at AT TIME ZONE p_timezone)<8),false),'categories',count(DISTINCT nullif(regexp_replace(coalesce(category,''),'\s*\(monde\)$','','i'),''))) INTO stats FROM own;
 CASE
 WHEN p_badge_id='first_capture' OR p_badge_id LIKE 'explorer_%' THEN progress:=(stats->>'total')::integer;
 WHEN p_badge_id LIKE 'level_%' THEN SELECT level INTO progress FROM public.profiles WHERE user_id=u;
 WHEN p_badge_id LIKE 'regions_%' THEN SELECT regions_explored INTO progress FROM public.profiles WHERE user_id=u;
 WHEN p_badge_id='geo_10' THEN progress:=(stats->>'geo')::integer;
 WHEN p_badge_id='night_owl' THEN progress:=CASE WHEN (stats->>'night')::boolean THEN 1 ELSE 0 END;
 WHEN p_badge_id='early_bird' THEN progress:=CASE WHEN (stats->>'early')::boolean THEN 1 ELSE 0 END;
 WHEN p_badge_id='categories_all' THEN progress:=(stats->>'categories')::integer;
 WHEN p_badge_id LIKE 'rare_%' THEN progress:=(stats->>'rare')::integer;
 WHEN p_badge_id LIKE 'legendary_%' THEN progress:=(stats->>'silver')::integer;
 WHEN p_badge_id LIKE 'mythic_%' THEN progress:=(stats->>'gold')::integer;
 WHEN p_badge_id LIKE 'social_%' THEN SELECT count(*) INTO progress FROM public.explorer_follows WHERE follower_id=u;
 WHEN p_badge_id LIKE 'followers_%' THEN SELECT count(*) INTO progress FROM public.explorer_follows WHERE following_id=u;
 WHEN p_badge_id='premium_member' THEN progress:=CASE WHEN public.is_premium(u) THEN 1 ELSE 0 END;
 WHEN p_badge_id='community_member' THEN progress:=1;
 WHEN p_badge_id IN ('podium_any','top10_any') THEN
 FOR cat IN SELECT DISTINCT regexp_replace(category,'\s*\(monde\)$','','i') FROM public.captures WHERE user_id=u AND status='approved' AND coalesce(category,'')<>'' LOOP
 SELECT rank INTO r FROM public.my_category_rank(cat); IF r IS NOT NULL AND (best_rank IS NULL OR r<best_rank) THEN best_rank:=r; END IF;
 END LOOP;
 progress:=CASE WHEN best_rank<=CASE WHEN p_badge_id='podium_any' THEN 3 ELSE 10 END THEN 1 ELSE 0 END;
 ELSE
 k:=CASE split_part(p_badge_id,'_',1) WHEN 'birds' THEN 'oiseau' WHEN 'mammals' THEN 'mammif' WHEN 'insects' THEN 'insecte' WHEN 'reptiles' THEN 'reptile' WHEN 'amphibians' THEN 'amphibien' WHEN 'fishes' THEN 'poisson' WHEN 'arachnids' THEN 'arachnide' WHEN 'molluscs' THEN 'mollusque' WHEN 'crustaceans' THEN 'crustace' END;
 IF k IS NULL THEN RETURN NULL; END IF;
 SELECT count(DISTINCT lower(animal_name)) INTO progress FROM public.captures WHERE user_id=u AND status='approved' AND strpos(public.reward_normalize(category),k)>0;
 END CASE;
 IF coalesce(progress,0)>=target THEN RETURN LEAST(xp,500); END IF;
 RETURN NULL;
 ELSIF starts_with(p_badge_id,'rank1_') THEN
 cat:=substring(p_badge_id FROM 7);
 IF NOT EXISTS(SELECT 1 FROM public.captures WHERE user_id=u AND status='approved' AND lower(regexp_replace(category,'\s*\(monde\)$','','i'))=cat) THEN RETURN NULL; END IF;
 SELECT rank INTO r FROM public.my_category_rank(cat);
 IF r=1 THEN RETURN 500; END IF;
 ELSIF starts_with(p_badge_id,'collection_') THEN
 k:=substring(p_badge_id FROM 12);
 WITH members AS (SELECT a.name FROM public.animals a WHERE public.reward_species_group(a.name,a.scientific_name,a.category)=k)
 SELECT count(*),count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.captures c WHERE c.user_id=u AND c.status='approved' AND lower(c.animal_name)=lower(m.name))) INTO total,captured FROM members m;
 IF total>=2 AND captured>=total THEN RETURN LEAST(500,100+total*20); END IF;
 ELSIF starts_with(p_badge_id,'zone_') THEN
 IF substring(p_badge_id FROM 6) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN NULL; END IF;
 SELECT * INTO z FROM public.user_department_subscriptions WHERE id::text=substring(p_badge_id FROM 6) AND user_id=u;
 IF NOT FOUND THEN RETURN NULL; END IF;
 WITH members AS (SELECT a.name,a.rarity,EXISTS(SELECT 1 FROM public.captures c WHERE c.user_id=u AND c.status='approved' AND lower(c.animal_name)=lower(a.name)) AS owned FROM public.animals a WHERE EXISTS(SELECT 1 FROM public.animal_departments d WHERE d.department_code=z.department_code AND lower(d.animal_name)=lower(a.name))), chosen AS (
 SELECT * FROM members WHERE z.kind<>'city' OR owned OR (NOT public.reward_city_match(name,'city_exclude') AND public.reward_city_match(name,'city_include')) ORDER BY CASE WHEN z.kind='city' AND public.reward_city_match(name,'city_iconic') THEN 0 ELSE 1 END, CASE rarity WHEN 'common' THEN 0 WHEN 'uncommon' THEN 1 WHEN 'rare' THEN 2 WHEN 'very_rare' THEN 3 WHEN 'ultra_rare' THEN 4 WHEN 'illustration_rare' THEN 5 WHEN 'special_rare' THEN 6 WHEN 'hyper_rare' THEN 7 ELSE 4 END,name LIMIT CASE WHEN z.kind='city' THEN 55 ELSE 2147483647 END)
 SELECT count(*),count(*) FILTER(WHERE owned) INTO total,captured FROM chosen;
 IF total>0 AND captured>=total THEN RETURN LEAST(500,100+total*20); END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.claim_badge_in_timezone(p_badge_id text,p_xp_reward integer,p_timezone text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); xp integer;
BEGIN
 IF u IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('reward:'||u::text,0));
 IF EXISTS(SELECT 1 FROM public.user_badges WHERE user_id=u AND badge_id=p_badge_id) THEN RETURN false; END IF;
 xp:=public.reward_eligibility(p_badge_id,p_timezone);
 IF xp IS NULL THEN RETURN false; END IF;
 INSERT INTO public.user_badges(user_id,badge_id,xp_reward) VALUES(u,p_badge_id,xp) ON CONFLICT(user_id,badge_id) DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM public.grant_xp(u,xp); RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.claim_badge(p_badge_id text,p_xp_reward integer) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.claim_badge_in_timezone(p_badge_id,p_xp_reward,'Europe/Paris') $$;
REVOKE ALL ON FUNCTION public.reward_city_match(text,text),public.reward_eligibility(text,text),public.claim_badge(text,integer),public.claim_badge_in_timezone(text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reward_city_match(text,text),public.reward_eligibility(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_badge(text,integer),public.claim_badge_in_timezone(text,integer,text) TO authenticated,service_role;