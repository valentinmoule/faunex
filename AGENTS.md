# AGENTS.md

Rules for working on this codebase.

## Partner landing pages share one presentation

Use the shared partner page with audience-specific translated copy and imagery, keeping public partner routes gated out of native builds to avoid duplicated layouts and marketing screens in the native app.

## Full-screen overlays must escape animated page wrappers

Wrap any `position: fixed` overlay (reward sheets, modals, lightboxes) in `createPortal`, targeting the open `[role="dialog"]` when one exists, otherwise `document.body`.

**Why:** transformed page wrappers otherwise contain and misplace fixed descendants.

## iOS headers and card surfaces stay within their viewport

Keep sticky headers below the native top safe area, remove page transition transforms after entry, and constrain species sheets to vertical scrolling while leaving photo carousels horizontal, because WebKit otherwise hides headers or permits sideways page movement.

Use a single gradient background for native iOS iridescent frames, retaining the existing inner photo clipping and motion, because animated dual background clipping is unstable in WebKit.

## Rewards are server-authoritative

Validate all claims from trusted rules (synced with badge/group/city definitions), ignoring client XP while preserving caps and legacy calls. Award capture XP once after approval and catalogue triggers; lock profile updates and credit league points only through grant_xp, because retries and concurrency must not multiply rewards.

## Blurred photo backdrops need a large scale

Any full-bleed `filter: blur()` photo backdrop (`background-size: cover` on a viewport-sized element) must be scaled well past the blur radius — `scale(1.9)` for a 42px blur, `scale(2.25)` for 50px — and the layer behind it must stay opaque.

**Why:** blur fades alpha inward and exposes the screen behind an under-scaled layer.

## Shelving targets the exact displayed species tile

Match both common and scientific names before falling back to either, measure the live tile during flight, and keep the landing flash geometry unchanged, because shared binomials and flash scaling make a correctly placed card appear to miss its slot.

## Leaderboard movement compares with the same board 24 hours earlier

Compute rank movement server-side from captures before `now() - 24 hours`, preserving the active scope, period, and animal category so arrows always compare like with like.

## Shelving transition stays on the Bestiary surface

Keep the capture view visible until the Bestiary is ready, then show the real Bestiary and glide the small card directly into its actual tile; never cover the Bestiary with an intermediate blank veil or waiting card.

## A capture fills exactly one Bestiary tile

Match captures (including pending shelves) to tiles by exact common name first; use the scientific name only when it points to a single tile, because domestic breeds share one binomial and would all get the same photo.

## Bundle badge artwork

Import badge art locally; hosted `/__l5e/assets-v1/` routes are absent from native bundles.

## One pending moderation request per user and species

Guard manual submissions with a synchronous lock on the client and keep the partial unique index on pending captures (user, trimmed lowercase name), because rapid taps used to queue the same photo several times.

## Supabase writes must be awaited or chained to a handler

Await or chain every Supabase write with a handler: lazy builders send nothing otherwise. Chain `.then()` without awaiting before gesture-dependent payment popups, to preserve browser permission.

## User-typed species names snap to existing tiles

Resolve capture names server-side against the catalogue (exact, synonyms, singular/plural-insensitive, then fuzzy) before creating a new species, because spelling variants like "Passereaux" otherwise create duplicate Bestiary tiles.

## Discoverer counts come from a trigger-maintained cache

`species_finder_counts()` reads `species_finder_cache`, kept in sync per species by a trigger on captures, because recomputing the full aggregate on every paginated call was the top database cost.

## Privileged notifications validate stored events

Derive recipients/content from verified follows, interactions, moderation captures or blocked accounts and deduplicate by event ID, because caller fields cannot prove a legitimate notification.

## Nearby endpoints consume reserved searches

Reserve and consume nearby searches under one per-user database lock, including older client reservations, because endpoint auth alone does not enforce quotas.

## Private preferences use the owner RPC

Read private preferences with `get_my_profile`; keep public profile fields and legacy sharing-preference reads column-granted, because private notification/email fields must not be community-readable while existing native sharing behavior remains supported.
