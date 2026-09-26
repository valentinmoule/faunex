# AGENTS.md

Rules for working on this codebase.

## Full-screen overlays must escape animated page wrappers

Wrap any `position: fixed` overlay (reward sheets, modals, lightboxes) in `createPortal`, targeting the open `[role="dialog"]` when one exists, otherwise `document.body`.

**Why:** `div.page-transition` carries `transform` + `will-change`, which makes it the containing block for `fixed` descendants — an overlay rendered inside a page would be sized to the whole scrollable document and pushed off-screen.

## Subscription-gated badges must be validated on the server

Check Premium eligibility in the badge claim function, not only in the badge UI, so a modified client cannot claim an unearned subscription badge.

## Blurred photo backdrops need a large scale

Any full-bleed `filter: blur()` photo backdrop (`background-size: cover` on a viewport-sized element) must be scaled well past the blur radius — `scale(1.9)` for a 42px blur, `scale(2.25)` for 50px — and the layer behind it must stay opaque.

**Why:** blurring fades the element's alpha inward by roughly 3σ, so an under-scaled backdrop lets the screen behind it bleed through as ghosted text.
