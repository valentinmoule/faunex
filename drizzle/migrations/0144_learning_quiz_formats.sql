CREATE OR REPLACE FUNCTION public.learning_validate_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE c jsonb;l jsonb;q jsonb;ids text[]:=ARRAY[]::text[];
BEGIN
 NEW.updated_at:=now();
 IF jsonb_typeof(NEW.content->'chapters') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_CONTENT'; END IF;
 IF NEW.published AND (btrim(NEW.title)='' OR jsonb_array_length(NEW.content->'chapters')=0) THEN RAISE EXCEPTION 'INCOMPLETE_CONTENT'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(NEW.content->'chapters') LOOP
 IF jsonb_typeof(c->'lessons') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_CHAPTER'; END IF;
 IF NEW.published AND (coalesce(c->>'title','')='' OR coalesce(c->>'title_en','')='' OR jsonb_array_length(c->'lessons')=0) THEN RAISE EXCEPTION 'INCOMPLETE_CHAPTER'; END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(c->'lessons') LOOP
 IF coalesce(l->>'id','')='' OR l->>'id'=ANY(ids) THEN RAISE EXCEPTION 'INVALID_LESSON_ID'; END IF; ids:=array_append(ids,l->>'id');
 IF jsonb_typeof(l->'questions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_QUESTIONS'; END IF;
 IF NEW.published AND (jsonb_array_length(l->'questions')<>5 OR coalesce(l->>'title','')='' OR coalesce(l->>'title_en','')='' OR coalesce(l->>'intro','')='' OR coalesce(l->>'intro_en','')='') THEN RAISE EXCEPTION 'INCOMPLETE_LESSON'; END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(l->'questions') LOOP
 IF jsonb_typeof(q->'options') IS DISTINCT FROM 'array' OR jsonb_typeof(q->'options_en') IS DISTINCT FROM 'array' OR jsonb_typeof(q->'correct') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'INVALID_QUESTION'; END IF;
 IF (q->>'correct')::numeric<>trunc((q->>'correct')::numeric) OR (q->>'correct')::integer<0 OR (q->>'correct')::integer>=jsonb_array_length(q->'options') THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;
 IF NEW.published AND (coalesce(q->>'type','') NOT IN ('mcq','boolean','visual','duel','intruder','audio') OR coalesce(q->>'prompt','')='' OR coalesce(q->>'prompt_en','')='' OR coalesce(q->>'explanation','')='' OR coalesce(q->>'explanation_en','')='' OR jsonb_array_length(q->'options')<2 OR jsonb_array_length(q->'options')<>jsonb_array_length(q->'options_en') OR (q->>'type'='boolean' AND jsonb_array_length(q->'options')<>2) OR (q->>'type'='visual' AND (coalesce(q->>'image','') NOT LIKE 'https://%' OR coalesce(q->>'credit','')='')) OR (q->>'type' IN ('duel','intruder') AND (jsonb_typeof(q->'images') IS DISTINCT FROM 'array' OR jsonb_array_length(q->'images')<>jsonb_array_length(q->'options') OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(q->'images') img WHERE img NOT LIKE 'https://%') OR coalesce(q->>'credit','')='')) OR (q->>'type'='audio' AND (coalesce(q->>'audio','') NOT LIKE 'https://%' OR coalesce(q->>'credit','')=''))) THEN RAISE EXCEPTION 'INCOMPLETE_QUESTION'; END IF;
 END LOOP; END LOOP; END LOOP;
 IF NEW.published AND btrim(NEW.title_en)='' THEN RAISE EXCEPTION 'INCOMPLETE_TRANSLATION'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.learning_completions WHERE path_id=OLD.id AND NOT(lesson_id=ANY(ids))) THEN RAISE EXCEPTION 'COMPLETED_LESSON_CANNOT_BE_REMOVED'; END IF;
 RETURN NEW;
END $function$;