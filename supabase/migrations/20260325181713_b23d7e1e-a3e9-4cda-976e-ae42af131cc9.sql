-- Migrate rarity values: uncommon → common, legendary → epic
UPDATE public.animals SET rarity = 'common' WHERE rarity = 'uncommon';
UPDATE public.animals SET rarity = 'epic' WHERE rarity = 'legendary';
UPDATE public.captures SET rarity = 'common' WHERE rarity = 'uncommon';
UPDATE public.captures SET rarity = 'epic' WHERE rarity = 'legendary';