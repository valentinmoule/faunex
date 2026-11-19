CREATE OR REPLACE FUNCTION public.is_bee_group_label(p_name text, p_scientific text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  WITH s AS (
    SELECT regexp_split_to_array(btrim(lower(regexp_replace(coalesce(p_scientific,''), '[^A-Za-z. ]+', ' ', 'g'))), '\s+') AS t,
           btrim(regexp_replace(translate(lower(coalesce(p_name,'')), 'àâäéèêëîïôöùûüç''’-', 'aaaeeeeiioouuuc   '), '[^a-z]+', ' ', 'g')) AS n,
           btrim(coalesce(p_scientific,'')) = '' AS no_sci
  )
  SELECT CASE
    WHEN s.no_sci THEN s.n = ANY (ARRAY['abeille','abeilles','abeille sauvage','abeilles sauvages','abeille solitaire','abeilles solitaires','abeille sauvage solitaire','abeille miniere','petite abeille miniere','bourdon','bourdons','bourdon noir','andrene','andrenes','halicte','halictes','halictidae','lasioglosse','lasioglossum','megachile','megachiles','osmie','osmies','collete','colletes','abeille des colletes','anthidie','abeille laineuse','nomade','abeille a bandes jaunes','abeille a bandes bleues','amegille','ceratine','cerazine','dasypode','melipone','hylee','abeille a masque','eucere','anthophore','apide','sphecode','abeille suintante metallique'])
    ELSE s.t[1] = ANY (ARRAY['apis','bombus','xylocopa','ceratina','nomada','thyreus','amegilla','anthophora','eucera','tetralonia','melecta','epeolus','ammobates','habropoda','andrena','panurgus','melitturga','camptopoeum','halictus','lasioglossum','seladonia','sphecodes','agapostemon','nomia','nomioides','augochlora','augochlorella','augochloropsis','megachile','osmia','anthidium','anthidiellum','pseudoanthidium','rhodanthidium','chelostoma','heriades','hoplitis','hoplosmia','protosmia','coelioxys','stelis','dioxys','lithurgus','trachusa','colletes','hylaeus','dasypoda','melitta','macropis','tetragonisca','trigona','melipona','tetragonula','plebeia','scaptotrigona','euglossa','eulaema','centris','epicharis','melissodes','peponapis','xenoglossa','ptilothrix','diadasia','calliopsis','perdita','systropha','rophites','dufourea','anthophila','apidae','andrenidae','halictidae','megachilidae','colletidae','melittidae','stenotritidae','meliponini','bombini','apini','euglossini','anthophorini','osmiini','anthidiini'])
         AND (coalesce(array_length(s.t,1),0) = 1 OR s.t[2] ~ '^spp?\.?$')
  END
  FROM s
$$;

CREATE OR REPLACE FUNCTION public.guard_bee_species_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'animals' THEN
    IF (TG_OP = 'INSERT' OR OLD.name IS DISTINCT FROM NEW.name OR OLD.scientific_name IS DISTINCT FROM NEW.scientific_name)
       AND public.is_bee_group_label(NEW.name, NEW.scientific_name) THEN
      RAISE EXCEPTION 'BEE_SPECIES_REQUIRED: une espèce d''abeille précise est requise, jamais un groupe.' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.animal_name IS DISTINCT FROM NEW.animal_name OR OLD.scientific_name IS DISTINCT FROM NEW.scientific_name)
     AND public.is_bee_group_label(NEW.animal_name, NEW.scientific_name) THEN
    RAISE EXCEPTION 'BEE_SPECIES_REQUIRED: choisis l''espèce précise de cette abeille ou laisse la photo en modération.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS zzzz_guard_bee_species_identity ON public.animals;
CREATE TRIGGER zzzz_guard_bee_species_identity BEFORE INSERT OR UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.guard_bee_species_identity();
DROP TRIGGER IF EXISTS zzzz_guard_bee_species_identity ON public.captures;
CREATE TRIGGER zzzz_guard_bee_species_identity BEFORE INSERT OR UPDATE ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.guard_bee_species_identity();