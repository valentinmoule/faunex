-- Phase 0 : snapshots de sécurité (aucune donnée existante modifiée)
CREATE TABLE public.animals_backup_20260819 AS SELECT * FROM public.animals;
CREATE TABLE public.animal_departments_backup_20260819 AS SELECT * FROM public.animal_departments;
CREATE TABLE public.profiles_counters_backup_20260819 AS
  SELECT user_id, total_captures, xp, level, xp_to_next, regions_explored, now() AS snapshot_at
  FROM public.profiles;

GRANT ALL ON public.animals_backup_20260819 TO service_role;
GRANT ALL ON public.animal_departments_backup_20260819 TO service_role;
GRANT ALL ON public.profiles_counters_backup_20260819 TO service_role;

ALTER TABLE public.animals_backup_20260819 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_departments_backup_20260819 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_counters_backup_20260819 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read animals backup"
  ON public.animals_backup_20260819 FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read animal departments backup"
  ON public.animal_departments_backup_20260819 FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read counters backup"
  ON public.profiles_counters_backup_20260819 FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));