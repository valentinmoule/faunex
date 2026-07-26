CREATE OR REPLACE FUNCTION public.ensure_weekly_quests_for(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week date := (date_trunc('week', CURRENT_DATE))::date;
  v_last_week date := (date_trunc('week', CURRENT_DATE) - interval '7 days')::date;
  v_count integer;
  v_level integer;
  v_inserted integer := 0;
  q record;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date = v_week;

  IF v_count >= 3 THEN
    RETURN 0;
  END IF;

  IF v_count > 0 THEN
    DELETE FROM public.daily_quests WHERE user_id = p_user_id AND quest_date = v_week;
  END IF;

  SELECT COALESCE(level, 0) INTO v_level FROM public.profiles WHERE user_id = p_user_id;
  v_level := COALESCE(v_level, 0);

  FOR q IN
    WITH pool(quest_type, title, description, icon, target, xp_reward, difficulty) AS (
      VALUES
        ('capture_count','Démarrage de la semaine','Fais 3 captures cette semaine','🌅',3,80,1),
        ('capture_count','Chasseur de la semaine','Capture 7 espèces cette semaine','📸',7,200,2),
        ('capture_count','Marathon hebdo','Capture 12 espèces cette semaine','🏃',12,350,3),
        ('capture_count','Frénésie de captures','Capture 10 espèces cette semaine','🔥',10,300,3),
        ('capture_different','Diversité','Capture 4 espèces différentes cette semaine','🦎',4,200,1),
        ('capture_different','Naturaliste curieux','Capture 6 espèces différentes cette semaine','🔬',6,300,2),
        ('capture_different','Collectionneur','Capture 8 espèces différentes cette semaine','🗃️',8,400,3),
        ('capture_rarity','Trouvaille rare','Capture 2 espèces rares ou mieux cette semaine','💎',2,250,1),
        ('capture_rarity','Chasseur d''élite','Capture 4 espèces rares ou mieux cette semaine','⚡',4,450,3),
        ('capture_rarity','Chercheur de trésors','Trouve 3 animaux rares cette semaine','🏅',3,350,2),
        ('new_zone','Aventurier','Capture dans 2 nouveaux lieux cette semaine','🧭',2,180,1),
        ('new_zone','Explorateur','Explore 3 zones différentes cette semaine','🗺️',3,250,2),
        ('new_zone','Globe-trotter','Explore 5 zones différentes cette semaine','🌍',5,400,3),
        ('share_app','Ambassadeur','Partage Faunex avec un ami','🔗',1,50,1),
        ('share_app','Bouche-à-oreille','Fais découvrir Faunex autour de toi','🗣️',1,50,1)
    ),
    filtered AS (
      SELECT p.*
      FROM pool p
      WHERE (
        CASE WHEN v_level <= 2 THEN p.difficulty <= 2
             WHEN v_level >= 5 THEN p.difficulty >= 2
             ELSE true END
      )
    ),
    ranked AS (
      SELECT f.*,
             row_number() OVER (
               PARTITION BY f.quest_type
               ORDER BY (SELECT 1 FROM public.daily_quests d
                         WHERE d.user_id = p_user_id AND d.quest_date = v_last_week AND d.title = f.title) NULLS FIRST,
                        md5(f.title || p_user_id::text || v_week::text)
             ) AS rn
      FROM filtered f
    )
    SELECT * FROM ranked
    WHERE rn = 1
    ORDER BY md5(quest_type || p_user_id::text || v_week::text)
    LIMIT 3
  LOOP
    INSERT INTO public.daily_quests
      (user_id, quest_type, title, description, icon, target, xp_reward, progress, completed, claimed, quest_date)
    VALUES
      (p_user_id, q.quest_type, q.title, q.description, q.icon, q.target, q.xp_reward, 0, false, false, v_week);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_weekly_quests()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ensure_weekly_quests_for(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.ensure_weekly_quests_for(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_quests_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_quests() TO authenticated, service_role;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.ensure_weekly_quests_for(r.user_id);
  END LOOP;
END $$;