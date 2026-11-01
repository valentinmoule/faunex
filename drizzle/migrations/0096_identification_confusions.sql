create or replace function public.identification_confusions(_scientific text)
returns table(predicted_name text, label_name text, label_scientific text, n bigint)
language sql stable security definer set search_path = public as $$
  with d as (
    select distinct on (capture_id) capture_id, predicted_name, lower(predicted_scientific_name) p
    from ml_dataset_events
    where event_type = 'auto_moderation_deferred' and capture_id is not null
      and lower(predicted_scientific_name) = lower(trim(_scientific))
    order by capture_id, created_at
  ), m as (
    select distinct on (e.capture_id) e.capture_id, e.label_name, e.label_scientific_name l
    from ml_dataset_events e join d using (capture_id)
    where e.event_type = 'moderation_approved' and e.label_scientific_name ~ '^[A-Za-z]+ [a-z]+'
    order by e.capture_id, e.created_at desc
  )
  select max(d.predicted_name), max(m.label_name), m.l, count(*)
  from d join m using (capture_id)
  where split_part(d.p,' ',1) || ' ' || split_part(d.p,' ',2) <> lower(split_part(m.l,' ',1) || ' ' || split_part(m.l,' ',2))
  group by m.l having count(*) >= 2 order by 4 desc limit 3
$$;
revoke all on function public.identification_confusions(text) from public, anon, authenticated;
grant execute on function public.identification_confusions(text) to service_role;
create index if not exists ml_dataset_events_pred_sci_deferred_idx on public.ml_dataset_events (lower(predicted_scientific_name)) where event_type = 'auto_moderation_deferred';