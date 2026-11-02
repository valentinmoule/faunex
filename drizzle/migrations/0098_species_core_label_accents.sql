CREATE OR REPLACE FUNCTION public.species_core_label(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
 SELECT nullif(btrim(regexp_replace(regexp_replace(
   ' ' || coalesce(public.singular_animal_label(translate(lower(coalesce(p,'')),
     'àáâãäåāçčèéêëēėęìíîïīįñòóôõöøōœùúûüūýÿšž’''',
     'aaaaaaacceeeeeeeiiiiiinoooooooouuuuuyysz  ')),'') || ' ',
   ' (de|du|des|d|la|le|les|l|au|aux|en|et|a|race|type) ', ' ', 'g'),
   '^ (chien|chat|cheval|poney|lapin|chevre|mouton|vache|cochon|poule|coq) (?=[a-z]{4,})', ' ')),'');
$$;