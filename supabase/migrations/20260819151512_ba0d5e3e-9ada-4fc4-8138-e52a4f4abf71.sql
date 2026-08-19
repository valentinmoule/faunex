UPDATE public.collection_rules cr
SET rule_type = 'descendant_of', params = v.params
FROM (VALUES
  ('races-de-chiens',       '{"names":["Chiens"]}'::jsonb),
  ('races-de-chats',        '{"names":["Chats"]}'::jsonb),
  ('races-equines',         '{"names":["Chevaux","Ânes"]}'::jsonb),
  ('races-bovines',         '{"names":["Bovins"]}'::jsonb),
  ('races-ovines-caprines', '{"names":["Ovins","Caprins"]}'::jsonb),
  ('races-porcines',        '{"names":["Porcins"]}'::jsonb),
  ('races-de-lapins',       '{"names":["Lapins domestiques"]}'::jsonb),
  ('races-de-volailles',    '{"names":["Volailles","Canards domestiques","Oies domestiques","Dindons"]}'::jsonb),
  ('papillons',             '{"names":["Papillons (groupe)"]}'::jsonb),
  ('libellules',            '{"names":["Libellules (groupe)"]}'::jsonb),
  ('coccinelles',           '{"names":["Coccinelles (groupe)"]}'::jsonb),
  ('rapaces',               '{"names":["Rapaces diurnes (groupe)","Rapaces nocturnes (groupe)"]}'::jsonb),
  ('cervides',              '{"names":["Cervidés (groupe)"]}'::jsonb)
) AS v(slug, params)
JOIN public.collections c ON c.slug = v.slug
WHERE cr.collection_id = c.id;

SELECT public.refresh_collection_membership(NULL);