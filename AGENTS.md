# AGENTS.md

Rules for working on this codebase.

## Full-screen overlays must escape animated page wrappers

Wrap any `position: fixed` overlay (reward sheets, modals, lightboxes) in `createPortal`, targeting the open `[role="dialog"]` when one exists, otherwise `document.body`.

**Why:** transformed page wrappers otherwise contain and misplace fixed descendants.

## Subscription-gated badges must be validated on the server

Check Premium eligibility in the badge claim function, not only in the badge UI, so a modified client cannot claim an unearned subscription badge.

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

Every Supabase query builder call (insert, update, delete, upsert) must be `await`ed or have a `.then()` with a handler attached. When the write is followed by something that needs the live user gesture (opening a payment portal popup), chain `.then()` and keep going synchronously instead of awaiting.

**Why:** PostgREST builders are lazy thenables — the HTTP request only leaves when `then()` runs, so a bare `void supabase.from(...)` fails silently and nothing is stored.
