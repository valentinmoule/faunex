/** Generated badge artwork URL registry. */
export const BADGE_ART: Record<string, string> = {
  'amphibians_3': '/__l5e/assets-v1/1b184d33-9b17-4b14-a247-3bbb45cce6f0/amphibians_3.png',
  'arachnids_3': '/__l5e/assets-v1/7e34c982-21ba-487c-b105-a4ab9e91e9a0/arachnids_3.png',
  'birds_5': '/__l5e/assets-v1/b5a66f29-a8b5-4c7c-aed4-dfc3d92311ff/birds_5.png',
  'categories_all': '/__l5e/assets-v1/cd923827-b334-4793-889c-95968ad5a55f/categories_all.png',
  'collection_default': '/__l5e/assets-v1/da3c2ffe-0cb5-4353-a180-9c8d1a9a3383/collection_default.png',
  'crustaceans_3': '/__l5e/assets-v1/187480a7-a9aa-4d69-aae1-abdde9eb697a/crustaceans_3.png',
  'early_bird': '/__l5e/assets-v1/95eb4d9b-246c-4d95-a70e-29d4c4f59b43/early_bird.png',
  'explorer_10': '/__l5e/assets-v1/7bcac8f3-4a14-41d2-bed8-f7ddafff3542/explorer_10.png',
  'explorer_100': '/__l5e/assets-v1/f47b148e-1230-4cad-ae59-29c2507a5d90/explorer_100.png',
  'explorer_25': '/__l5e/assets-v1/cbfda0a7-ab70-4a05-b92b-e450a62f9da8/explorer_25.png',
  'explorer_50': '/__l5e/assets-v1/351cdae0-8032-4fbf-89ae-aacfd273042b/explorer_50.png',
  'first_capture': '/__l5e/assets-v1/fc0b282d-fced-4d55-96d2-453b0aaf68e1/first_capture.png',
  'fishes_3': '/__l5e/assets-v1/4866645c-a760-4d6d-a51d-1fc6dafb042c/fishes_3.png',
  'followers_25': '/__l5e/assets-v1/b0c9e919-836b-4d09-9365-d06b5f762b96/followers_25.png',
  'followers_5': '/__l5e/assets-v1/b794178c-f715-410d-9ee3-5ca86389c284/followers_5.png',
  'geo_10': '/__l5e/assets-v1/a7a5f871-af58-4c8a-bad6-0e3fc22701c0/geo_10.png',
  'insects_5': '/__l5e/assets-v1/13b475c8-a58e-4175-bafb-f0f981e09da4/insects_5.png',
  'legendary_1': '/__l5e/assets-v1/ad44c9d1-c28b-4beb-bceb-87d39c688ed8/legendary_1.png',
  'legendary_5': '/__l5e/assets-v1/ac5ad0d3-7da3-4ee3-afa0-8fba05e71d9b/legendary_5.png',
  'level_10': '/__l5e/assets-v1/0c1dee2b-e749-4569-aa1b-32b757fc3f86/level_10.png',
  'level_5': '/__l5e/assets-v1/dd2ed714-9aa5-495c-8642-bf70a2cb2608/level_5.png',
  'mammals_5': '/__l5e/assets-v1/50b087b1-71fe-4180-ae38-a559b61d0837/mammals_5.png',
  'molluscs_3': '/__l5e/assets-v1/27da2f10-6f32-4db1-8121-d2f8508a016b/molluscs_3.png',
  'mythic_1': '/__l5e/assets-v1/ac272517-282b-47c8-8757-6cbe0ee500d6/mythic_1.png',
  'mythic_3': '/__l5e/assets-v1/54fe2968-e12f-4107-a9f1-3378900b96ef/mythic_3.png',
  'night_owl': '/__l5e/assets-v1/8e1ab151-7911-4fb2-8c3c-1c500bbfe096/night_owl.png',
  'podium_any': '/__l5e/assets-v1/c4d3616d-a6b8-4398-8035-7d2341183567/podium_any.png',
  'rank1_default': '/__l5e/assets-v1/3da3d8ec-171e-4a45-a2a2-7b6f4d7de20c/rank1_default.png',
  'rare_1': '/__l5e/assets-v1/76028935-eb37-4af0-b7b8-66456d9174d1/rare_1.png',
  'rare_10': '/__l5e/assets-v1/13a12f1c-9dfe-4005-aa6b-db79a6378bef/rare_10.png',
  'regions_10': '/__l5e/assets-v1/68c06998-7523-486d-952f-3279ed7f6628/regions_10.png',
  'regions_3': '/__l5e/assets-v1/12f85d9d-4ab7-4e52-b38f-4c82384c4fec/regions_3.png',
  'reptiles_3': '/__l5e/assets-v1/fcab333f-bc07-4f9d-84df-2d61637ae6fd/reptiles_3.png',
  'social_10': '/__l5e/assets-v1/681c4c3c-085f-4f8b-ad6f-c11de0b52893/social_10.png',
  'social_3': '/__l5e/assets-v1/8b45bfa9-908a-4b28-a04a-3e2ed6ee69b8/social_3.png',
  'top10_any': '/__l5e/assets-v1/2a357c6a-5a3b-469d-85c8-89c826f94c88/top10_any.png',
};

export const getBadgeArt = (badgeId: string) =>
  BADGE_ART[badgeId] ??
  (badgeId.startsWith('collection_')
    ? BADGE_ART.collection_default
    : badgeId.startsWith('rank1_')
    ? BADGE_ART.rank1_default
    : undefined);
