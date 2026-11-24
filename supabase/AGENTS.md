## Moderator stats are server-logged
Catalogue RPC wrappers log to `moderator_actions`; approvals use `ml_dataset_events.moderator_id`.

## Capture UPDATE guard
Compare protected fields via SECURITY DEFINER; self-querying RLS recurses.

## Displayed conservation follows the verified IUCN status
Triggers align profile/approved capture `conservation` with `animals.iucn_status` (except NE): that status drives rarity, AI text goes stale.

## Bees are collectible only as species
Keep SQL `is_bee_group_label` and TS `isBeeGroupLabel` in sync; identification, moderation and triggers refuse bee genus/family/"sp." labels, since group tiles hide distinct species.

## Observation rarity is ranked from GBIF field records
`rarity_tier_for_observations` ranks `animals.gbif_observations` per base category (cap Épique); only raise tiles, keep IUCN/domestic rules in `hybrid_rarity`, since demotions devalue collections.
