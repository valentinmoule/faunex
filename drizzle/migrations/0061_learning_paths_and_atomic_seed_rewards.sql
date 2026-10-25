CREATE TABLE public.learning_paths(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, title_en text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, content jsonb NOT NULL DEFAULT '{"chapters":[]}', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.learning_paths TO authenticated; GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_admin ON public.learning_paths TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.learning_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,path_id uuid NOT NULL REFERENCES public.learning_paths(id),lesson_id text NOT NULL,snapshot jsonb NOT NULL,answers jsonb NOT NULL DEFAULT '[]',finished boolean NOT NULL DEFAULT false,result jsonb,created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.learning_attempts TO service_role;
ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX learning_open_attempt ON public.learning_attempts(user_id,path_id,lesson_id) WHERE NOT finished;
CREATE TABLE public.learning_completions(user_id uuid NOT NULL,path_id uuid NOT NULL REFERENCES public.learning_paths(id),lesson_id text NOT NULL,completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,path_id,lesson_id));
GRANT SELECT ON public.learning_completions TO authenticated; GRANT ALL ON public.learning_completions TO service_role;
ALTER TABLE public.learning_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_completion_owner ON public.learning_completions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX learning_daily ON public.learning_completions(user_id,completed_at);
CREATE FUNCTION public.learning_validate_content() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
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
 IF NEW.published AND (coalesce(q->>'type','') NOT IN ('mcq','boolean','visual') OR coalesce(q->>'prompt','')='' OR coalesce(q->>'prompt_en','')='' OR coalesce(q->>'explanation','')='' OR coalesce(q->>'explanation_en','')='' OR jsonb_array_length(q->'options')<2 OR jsonb_array_length(q->'options')<>jsonb_array_length(q->'options_en') OR (q->>'type'='boolean' AND jsonb_array_length(q->'options')<>2) OR (q->>'type'='visual' AND (coalesce(q->>'image','') NOT LIKE 'https://%' OR coalesce(q->>'credit','')=''))) THEN RAISE EXCEPTION 'INCOMPLETE_QUESTION'; END IF;
 END LOOP; END LOOP; END LOOP;
 IF NEW.published AND btrim(NEW.title_en)='' THEN RAISE EXCEPTION 'INCOMPLETE_TRANSLATION'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.learning_completions WHERE path_id=OLD.id AND NOT(lesson_id=ANY(ids))) THEN RAISE EXCEPTION 'COMPLETED_LESSON_CANNOT_BE_REMOVED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER learning_content_guard BEFORE INSERT OR UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION public.learning_validate_content();
CREATE FUNCTION public.learning_status() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); paths jsonb;done jsonb;used integer;lim integer;
BEGIN IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 lim:=CASE WHEN public.is_premium(u) THEN 10 ELSE 3 END;
 SELECT count(*) INTO used FROM public.learning_completions WHERE user_id=u AND completed_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 SELECT coalesce(jsonb_agg(jsonb_build_object('path_id',path_id,'lesson_id',lesson_id)),'[]') INTO done FROM public.learning_completions WHERE user_id=u;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'title_en',p.title_en,'chapters',(SELECT coalesce(jsonb_agg(jsonb_build_object('title',c->>'title','title_en',c->>'title_en','lessons',(SELECT coalesce(jsonb_agg(l-'questions'),'[]') FROM jsonb_array_elements(c->'lessons') l))),'[]') FROM jsonb_array_elements(p.content->'chapters') c)) ORDER BY p.sort_order,p.id),'[]') INTO paths FROM public.learning_paths p WHERE published;
 RETURN jsonb_build_object('paths',paths,'completed',done,'used',used,'limit',lim,'reset_at',(date_trunc('day',now() AT TIME ZONE 'UTC')+interval '1 day') AT TIME ZONE 'UTC'); END $$;
CREATE FUNCTION public.learning_attempt_view(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.learning_attempts;q jsonb;i integer;questions jsonb:='[]';
BEGIN SELECT * INTO a FROM public.learning_attempts WHERE id=p_id AND user_id=auth.uid(); IF a.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 FOR q,i IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(a.snapshot->'questions') WITH ORDINALITY LOOP
 IF i<jsonb_array_length(a.answers) THEN questions:=questions||jsonb_build_array(q); ELSE questions:=questions||jsonb_build_array(q-'correct'-'explanation'-'explanation_en'); END IF; END LOOP;
 RETURN jsonb_build_object('id',a.id,'lesson',jsonb_set(a.snapshot,'{questions}',questions),'answers',a.answers,'finished',a.finished,'result',a.result); END $$;
CREATE FUNCTION public.learning_start(p_path uuid,p_lesson text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();p public.learning_paths;l jsonb;target jsonb;allowed boolean:=true;a uuid;s jsonb;
BEGIN IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('learning:'||u::text,0));
 SELECT * INTO p FROM public.learning_paths WHERE id=p_path AND published; IF p.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 FOR l IN SELECT lesson FROM jsonb_array_elements(p.content->'chapters') c CROSS JOIN LATERAL jsonb_array_elements(c->'lessons') lesson LOOP
 IF l->>'id'=p_lesson THEN target:=l; EXIT; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.learning_completions WHERE user_id=u AND path_id=p_path AND lesson_id=l->>'id') THEN allowed:=false; END IF; END LOOP;
 IF target IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.learning_completions WHERE user_id=u AND path_id=p_path AND lesson_id=p_lesson) THEN
 IF NOT allowed THEN RAISE EXCEPTION 'LESSON_LOCKED'; END IF;
 s:=public.learning_status(); IF (s->>'used')::integer>=(s->>'limit')::integer THEN RAISE EXCEPTION 'DAILY_LIMIT'; END IF; END IF;
 SELECT id INTO a FROM public.learning_attempts WHERE user_id=u AND path_id=p_path AND lesson_id=p_lesson AND NOT finished;
 IF a IS NULL THEN INSERT INTO public.learning_attempts(user_id,path_id,lesson_id,snapshot) VALUES(u,p_path,p_lesson,target) RETURNING id INTO a; END IF;
 RETURN public.learning_attempt_view(a); END $$;
CREATE FUNCTION public.learning_answer(p_attempt uuid,p_index integer,p_choice integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.learning_attempts;q jsonb;n integer;
BEGIN SELECT * INTO a FROM public.learning_attempts WHERE id=p_attempt AND user_id=auth.uid() FOR UPDATE; IF a.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 n:=jsonb_array_length(a.answers);
 IF p_index<0 OR p_index>=jsonb_array_length(a.snapshot->'questions') THEN RAISE EXCEPTION 'INVALID_INDEX'; END IF;
 IF p_index<n THEN RETURN public.learning_attempt_view(a.id); END IF;
 IF a.finished OR p_index<>n THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
 q:=a.snapshot->'questions'->p_index;
 IF p_choice IS NULL OR p_choice<0 OR p_choice>=jsonb_array_length(q->'options') THEN RAISE EXCEPTION 'INVALID_CHOICE'; END IF;
 UPDATE public.learning_attempts SET answers=answers||jsonb_build_array(p_choice) WHERE id=a.id;
 RETURN public.learning_attempt_view(a.id); END $$;
CREATE FUNCTION public.learning_finish(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();a public.learning_attempts;score integer:=0;n integer;i integer;passed boolean;first_time boolean;delta bigint:=0;s jsonb;r jsonb;
BEGIN IF u IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('learning:'||u::text,0));
 SELECT * INTO a FROM public.learning_attempts WHERE id=p_attempt AND user_id=u FOR UPDATE; IF a.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF a.finished THEN RETURN public.learning_attempt_view(a.id); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.learning_paths WHERE id=a.path_id AND published) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 n:=jsonb_array_length(a.snapshot->'questions'); IF n=0 OR jsonb_array_length(a.answers)<>n THEN RAISE EXCEPTION 'INCOMPLETE_ATTEMPT'; END IF;
 FOR i IN 0..n-1 LOOP IF (a.answers->>i)::integer=(a.snapshot->'questions'->i->>'correct')::integer THEN score:=score+1; END IF; END LOOP;
 passed:=score*100>=n*80; first_time:=NOT EXISTS(SELECT 1 FROM public.learning_completions WHERE user_id=u AND path_id=a.path_id AND lesson_id=a.lesson_id);
 s:=public.learning_status();
 IF passed AND first_time THEN
 IF (s->>'used')::integer>=(s->>'limit')::integer THEN RAISE EXCEPTION 'DAILY_LIMIT'; END IF;
 INSERT INTO public.learning_completions(user_id,path_id,lesson_id) VALUES(u,a.path_id,a.lesson_id);
 delta:=public.eclats_apply(u,'lesson:'||a.path_id::text||':'||a.lesson_id,'lesson',10,a.lesson_id,1);
 END IF;
 r:=jsonb_build_object('score',score,'total',n,'passed',passed,'reward',CASE WHEN passed AND first_time THEN 10 ELSE 0 END,'balance_delta',delta);
 UPDATE public.learning_attempts SET finished=true,result=r WHERE id=a.id;
 RETURN public.learning_attempt_view(a.id); END $$;
REVOKE ALL ON FUNCTION public.learning_status(),public.learning_attempt_view(uuid),public.learning_start(uuid,text),public.learning_answer(uuid,integer,integer),public.learning_finish(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_status(),public.learning_attempt_view(uuid),public.learning_start(uuid,text),public.learning_answer(uuid,integer,integer),public.learning_finish(uuid) TO authenticated,service_role;
COMMENT ON TABLE public.learning_paths IS 'Versioned learning hierarchy in JSON. Learners receive answer-redacted content exclusively through RPCs.';