# Review: Play a 90-second relay arena and rejoin

## Verdict

**PASS — 0 findings and 0 untested public claims.**

Linebreak Clash lets solo players, two people at one keyboard, or two to four
people in a private room play a 90-second relay arena. Before scrolling, fresh
desktop and phone browsers showed the job, the audience, the playable arena,
and **Try it with sample data** as the first action.

## Candidate and scope

- Implementation reviewed: `8498e209db0f9f29641e883a3f3fd5acdac1f409`.
- Documentation baseline reviewed: `0803a93733e11758b5e7e8e445ec6a72fc46fd1d`.
- Live URL: <https://linebreak-clash.sociobot.in>.
- Fresh local `dist/` matched the live JavaScript and CSS byte-for-byte:
  `main--ddsxgKd.js` SHA-256
  `a399d8e72c156774c21ee063cc2855baa484185da9dd89e758ae5153eb5b6f28`, and
  `main-BdThT_9_.css` SHA-256
  `47624f40b8f8a787e16890ee2e2ffba2b5dd66b3eafcb6653c9323f8930a42ba`.

## Clean checkout and claims

Node 22.23.2 and npm 10.9.8 completed `npm ci` with no vulnerabilities.
Every one of the 30 commands declared in `.factory/claims.json` was invoked
separately from this checkout. The manifest audit found 30 unique claim IDs,
exactly one matching `@claim:<id>` outcome-test tag per ID, and no missing,
extra, or duplicate tags.

`CI=1 npm run check` passed: 10 unit tests, product-owned realtime authority,
persistence, expiry, capacity, reconnect, health, and rate-limit integration;
a production build; and 26 Chromium browser tests. The build produced 15.28 KB
gzip JavaScript and 4.94 KB gzip CSS.

| Claim coverage | Result |
| --- | --- |
| Entry, round end, restart, relay score, collision score, dash break, and trail expiry | Pass |
| Solo/local modes, remapped controls, pause, persisted settings, sound, effects, assist, and refresh recovery | Pass |
| Sample isolation, seeded state/reset, request privacy, clear-data flow, and offline play | Pass |
| Mobile FPS and touch target/control checks | Pass |
| Online room, invite copy, preset reactions, no open chat, authority, payload disclosure, rejoin, and SQLite persistence | Pass |

## Live game and sample

- The phone and desktop first screens showed the game itself. The phone arena
  was visible without horizontal overflow.
- One click opened a populated 4–2 sample with visible trails, relays, and the
  persistent **Demo — sample data, nothing is saved** label. Reset restored the
  sample. Preloaded real settings were unchanged.
- An idle 393×727 touch-browser run measured **60.0 FPS**. Touch steering,
  offline reload after service-worker control, and reduced-motion behavior
  passed.
- Two independent live browser contexts created and joined one room, started a
  real 90-second round, rejoined a dropped player, and reached the shared
  **“Lin wins.”** result. The polite result was focused at **Round complete**.
  A shared rematch reset both scores to zero.
- End-screen evidence: `/work/.evidence/linebreak-clash/online-end-live.png`.
  Run data: `/work/.evidence/linebreak-clash/live-browser.json`.

## Backend, routes, accessibility, and privacy

- Product-only live backend verification passed: `/health` returned 200 after
  a restart, active room state restored as `playing` with two players, a room
  credential could not access another room, and the request allowance returned
  HTTP 429 with `Retry-After: 60`.
- `/`, `/demo/`, `/online/`, `/privacy/`, and `/terms/` returned 200 with their
  expected titles. The styled `/not-a-page` returned the expected HTTP 404 and
  a way back, so it is not a finding. `robots.txt`, `sitemap.xml`, canonical
  metadata, and response CSP were present.
- Fresh live Axe checks on all six routes found zero violations, including zero
  serious or critical violations. Aggregate browser checks covered skip links,
  keyboard entries, focus contrast, dialog focus, 200% text reflow, labels,
  errors, and reduced motion.
- The live game run recorded zero console errors. Runtime requests went only
  to the static product origin and the product-owned realtime origin. No
  analytics, advertising, CDN, or other third-party request was observed.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1: incomplete four-player, authority, near-limit rejoin, and sample proof | Fixed and covered by tagged outcome tests. |
| Verification 1: Escape pause and undersized targets | Fixed and covered by keyboard and touch-target tests. |
| Verification 2: unlisted or incomplete public claims | Fixed: 30 listed claims passed separately. |
| Verification 2: low-contrast content focus | Fixed: live and aggregate focus checks pass. |
| Verification 2: online result was not announced or focused | Fixed: fresh live round announced and focused the result. |

## Known limit

Chromium is the automated and live browser used for this review. Safari and
Firefox remain manual release checks; the product does not make a cross-browser
claim.
