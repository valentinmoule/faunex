# AGENTS.md

Rules for working on this codebase.

## Full-screen overlays must escape animated page wrappers

Wrap any `position: fixed` overlay (reward sheets, modals, lightboxes) in `createPortal`, targeting the open `[role="dialog"]` when one exists, otherwise `document.body`.

**Why:** `div.page-transition` carries `transform` + `will-change`, which makes it the containing block for `fixed` descendants — an overlay rendered inside a page would be sized to the whole scrollable document and pushed off-screen.
