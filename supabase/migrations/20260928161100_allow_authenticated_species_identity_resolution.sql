-- La détection de doublon côté client doit reproduire la canonisation appliquée
-- par le trigger avant insertion, afin de proposer le remplacement de photo.
GRANT EXECUTE ON FUNCTION public.resolve_species_identity(text, text) TO authenticated;
