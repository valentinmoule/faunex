# AGENTS.md

Rules for working on this codebase.

## Referral rewards follow verified annual payments

Reserve referrals for authenticated new customers, verify completed transactions by reading Paddle, and grant both rewards atomically once; persist absolute billing targets before delaying renewals without proration so retries cannot multiply benefits. Keep separate entitlements for accounts without an active renewal because cancellation must stay intact.

## Family access derives from verified purchases

Keep family membership separate from personal data and billing, include the payer in the seat limit, serialize invitations and acceptance in database functions, and authorize Premium server-side; bind family purchases to authenticated checkout intents and never treat client or sandbox status as live access. Reuse the native external-browser checkout bridge for family purchases, carrying the verified intent without bypassing payment verification.
Bind emailed family invitations to the recipient's verified auth email in the acceptance RPC, issue them only through an authenticated owner-checked server function, and resume them after signup/profile completion; this prevents forwarded links from granting another account access.
Store explicitly authorized complimentary family access in service-only grants checked by family_valid, never by fabricating Paddle payments or changing billing rows; the existing subscription link is only an anchor for these grants.
Show the family offer from my_family, independent of personal billing rows.
Scope portal lookups to the billing environment and validate Paddle IDs; grant anchors cannot open portals.

## Partner landing pages share one presentation

Use the shared partner page with audience-specific translated copy and imagery, keeping public partner routes gated out of native builds to avoid duplicated layouts and marketing screens in the native app.

## Full-screen overlays must escape animated page wrappers

Portal fixed overlays (reward sheets, modals, lightboxes) into the open `[role="dialog"]`, otherwise `document.body`, because transformed page wrappers misplace fixed descendants.

## iOS headers and card surfaces stay within their viewport

Keep sticky headers below the native top safe area, remove page transition transforms after entry, and constrain species sheets to vertical scrolling while leaving photo carousels horizontal — WebKit otherwise hides headers or permits sideways page movement. Use a single gradient background for native iOS iridescent frames (keeping inner photo clipping and motion), because animated dual background clipping is unstable in WebKit.

## Rewards are server-authoritative

Validate claims from trusted rules (synced with badge/group/city definitions and the trigger-maintained group cache), ignoring client XP while preserving caps and legacy calls. Award capture XP once after approval and catalogue triggers; lock profile updates and credit league points only through grant_xp, because retries and concurrency must not multiply rewards.

## Blurred photo backdrops need a large scale

Scale full-bleed `filter: blur()` photo backdrops well past the blur radius (`scale(1.9)` for 42px, `scale(2.25)` for 50px) over an opaque layer, because blur fades alpha inward.

## Shelving targets the exact displayed species tile

Match common and scientific names before either alone, measure the live tile in flight, and keep the landing flash geometry, so cards never appear to miss their slot.

## Leaderboard movement compares with the same board 24 hours earlier

Compute rank movement server-side from captures before `now() - 24 hours`, keeping scope, period and category.

## Shelving transition stays on the Bestiary surface

Keep the capture view until the Bestiary is ready, then glide the card into its tile; never cover the Bestiary with a veil or waiting card.

## A capture fills exactly one Bestiary tile

Match captures (including pending shelves) to tiles by exact common name first; use the scientific name only when it points to a single tile, because domestic breeds share one binomial and would all get the same photo.

## Bundle badge artwork

Import badge art locally (no hosted asset routes natively).

## Collection artwork keeps explicit group assignments

Bundle group-specific art with biome fallbacks. Store standard/territory covers as owner-checked, user-scoped capture references; keep custom covers separate, so personal choices never change shared art and released captures stop supplying covers.

## One pending moderation request per user and species

Lock manual submissions and keep the pending user/species unique index to prevent duplicates. Resubmit owned captures via the quota-charging RPC, preserving photo/XP; exclude corrections from auto-moderation for human review.

## Supabase writes must be awaited or chained to a handler

Await or chain every Supabase write with a handler: lazy builders send nothing otherwise. Chain `.then()` without awaiting before gesture-dependent payment popups, to preserve browser permission.

## User-typed species names snap to existing tiles

Resolve capture names server-side against the catalogue (exact, synonyms, singular/plural-insensitive, then fuzzy) before creating a new species, because spelling variants like "Passereaux" otherwise create duplicate Bestiary tiles.

## Discoverer counts come from a trigger-maintained cache

`species_finder_counts()` reads `species_finder_cache`, kept in sync per species by a trigger on captures, because recomputing the full aggregate on every paginated call was the top database cost; clients use the shared `fetchFinderCounts()` cache.

## Privileged notifications validate stored events

Derive recipients/content from stored events, deduplicate per recipient, and enforce visibility for @mentions; use the comment trigger and preferences, because clients cannot prove notifications.

## Native push uses FCM tokens, separate from browser subscriptions

Register native FCM devices through authenticated server code, remove registrations before logout, and dispatch only from verified event handlers with private preferences and event deduplication; keep web push independent because APNs/FCM tokens are not VAPID subscriptions. Mobile Firebase configuration files belong only in native targets, never service-account keys in the bundle.

## Nearby endpoints consume reserved searches

Reserve and consume nearby searches under one per-user database lock, including older client reservations, because endpoint auth alone does not enforce quotas.

## Private preferences use the owner RPC

Read private preferences with `get_my_profile`; keep public profile fields and legacy sharing-preference reads column-granted, because private notification/email fields must not be community-readable while existing native sharing behavior remains supported.

## Realtime channel names must be unique per subscription

Suffix channel names randomly (reused topics crash `.on()`).

## Identification account overrides are server-authoritative

Resolve demo and internal identification overrides through the function-local account policy using the authenticated server user, never request fields; keep ordinary routing and quotas unchanged to isolate demo costs.

## Custom collections are species lists, not capture lists

Use species names for custom collection membership and refresh mounted collection hooks after successful membership writes, because uncaptured species have no capture ID and detail sheets and the Bestiary must stay synchronized. Hide capture-only favorites for uncaptured species.

<!-- LOVABLE:BEGIN -->
## Canonical species facts
Apply shared facts after capture name canonicalization, reject scientific conflicts, refresh facts on image-cache hits, and invalidate translations after source changes, because moderation and older clients can save stale descriptions under corrected names.
<!-- LOVABLE:END -->

## Themed collections are data, not code

Store admin themed collections (species names, optional rules and dates) in `themed_collections`, matched by `src/lib/themedCollections.ts`, with covers in the public captures bucket, so they ship without a store release.

## Photo contest is server-authoritative

Submit/vote/withdraw via contest RPCs (Paris weeks, one entry/vote); finalize winners lazily. All photo surfaces use the shared winner cache by displayed capture ID, never species, to avoid false awards.
