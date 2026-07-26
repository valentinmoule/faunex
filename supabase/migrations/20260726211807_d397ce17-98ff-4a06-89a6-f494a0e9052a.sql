DELETE FROM public.animal_departments
WHERE department_code = '75'
  AND animal_name IN (
    'Anémone de mer','Araignée de mer','Balane commune','Hippocampe moucheté',
    'Phoque moine de Méditerranée','Pieuvre géante du Pacifique','Poisson-pierre',
    'Requin-renard','Saint-Pierre','Sprat','Omble chevalier','Chameau de Bactriane',
    'Lézard ocellé','Couleuvre de Montpellier','Couleuvre à échelons','Couleuvre bordelaise',
    'Veuve noire méditerranéenne','Corneille noire de Corse','Lièvre variable',
    'Cassenoix moucheté','Martinet alpin','Merle à plastron','Lézard catalan',
    'Triton de Blasius','Triton marbré','Crapaud vert','Outarde canepetière',
    'Huîtrier pie','Tournepierre à collier','Chien viverrin','Diane',
    'Pie-grièche à tête rousse','Pie-grièche grise','Criquet migrateur',
    'Campagnol amphibie','Cheval Camargue','Cheval de Mérens'
  );

INSERT INTO public.animal_departments (animal_name, department_code)
SELECT a.name, '75'
FROM public.animals a
WHERE a.name IN (
  'Mouette rieuse','Goéland leucophée','Héron cendré','Cygne tuberculé','Foulque macroule',
  'Grèbe huppé','Bernache du Canada','Faucon crécerelle','Faucon pèlerin','Chouette hulotte',
  'Pic vert','Pic épeiche','Choucas des tours','Troglodyte mignon','Roitelet huppé',
  'Fauvette à tête noire','Pouillot véloce','Rougequeue noir','Bergeronnette grise',
  'Pipistrelle commune','Paon du jour','Vulcain','Machaon','Gendarme','Cloporte commun',
  'Guêpe commune','Frelon européen','Punaise diabolique'
)
ON CONFLICT (department_code, animal_name) DO NOTHING;