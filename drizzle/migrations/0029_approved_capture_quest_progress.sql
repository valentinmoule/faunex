CREATE OR REPLACE FUNCTION public.update_quest_progress() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q RECORD; v_new_progress integer; v_week_start date:=date_trunc('week',CURRENT_DATE)::date;
BEGIN
 IF NEW.status<>'approved' THEN RETURN NEW; END IF;
 FOR q IN SELECT d.id,d.progress,t.quest_type,t.target FROM public.daily_quests d JOIN public.quest_templates t ON t.id=d.template_id WHERE d.user_id=NEW.user_id AND d.quest_date=v_week_start AND d.completed=false LOOP
 v_new_progress:=q.progress;
 CASE q.quest_type
 WHEN 'capture_count' THEN
 SELECT count(*) INTO v_new_progress FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_week_start AND created_at<v_week_start+interval '7 days';
 v_new_progress:=GREATEST(v_new_progress,q.progress);
 WHEN 'capture_different' THEN
 SELECT count(DISTINCT animal_name) INTO v_new_progress FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_week_start AND created_at<v_week_start+interval '7 days';
 WHEN 'capture_rarity' THEN
 SELECT count(DISTINCT lower(animal_name)) INTO v_new_progress FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_week_start AND created_at<v_week_start+interval '7 days' AND rarity NOT IN ('common','uncommon');
 v_new_progress:=GREATEST(v_new_progress,q.progress);
 WHEN 'new_zone' THEN
 SELECT count(DISTINCT location) INTO v_new_progress FROM public.captures WHERE user_id=NEW.user_id AND status='approved' AND created_at>=v_week_start AND created_at<v_week_start+interval '7 days' AND location IS NOT NULL AND location<>'';
 ELSE NULL;
 END CASE;
 v_new_progress:=LEAST(v_new_progress,q.target);
 IF v_new_progress<>q.progress THEN UPDATE public.daily_quests SET progress=v_new_progress,completed=(v_new_progress>=q.target) WHERE id=q.id; END IF;
 END LOOP;
 RETURN NEW;
END $$;