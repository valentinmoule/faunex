CREATE OR REPLACE FUNCTION public.learning_finish(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();a public.learning_attempts;score integer:=0;n integer;i integer;passed boolean;first_time boolean;delta bigint:=0;s jsonb;r jsonb;key text;seen bigint;awarded bigint;
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
 END IF;
 key:='lesson:'||a.path_id::text||':'||a.lesson_id;
 SELECT count(*),coalesce(sum(amount),0) INTO seen,awarded FROM public.eclats_transactions WHERE user_id=u AND operation_key LIKE key||':%';
 IF score>awarded THEN delta:=public.eclats_apply(u,key||':'||(seen+1),'lesson',score-awarded,a.lesson_id,1); END IF;
 r:=jsonb_build_object('score',score,'total',n,'passed',passed,'reward',delta,'balance_delta',delta);
 UPDATE public.learning_attempts SET finished=true,result=r WHERE id=a.id;
 RETURN public.learning_attempt_view(a.id); END $$;
COMMENT ON FUNCTION public.learning_finish(uuid) IS 'Seeds earned equal the number of correct answers; a lesson never pays more than its best score across attempts.';