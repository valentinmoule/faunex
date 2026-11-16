## Moderator stats are server-logged
Catalogue RPC wrappers log to `moderator_actions`; approvals use `ml_dataset_events.moderator_id`.

## Capture UPDATE guard
Compare protected fields via SECURITY DEFINER; self-querying RLS recurses.

## Displayed conservation follows the verified IUCN status
Triggers align profile/approved capture `conservation` with `animals.iucn_status` (except NE): that status drives rarity, AI text goes stale.
