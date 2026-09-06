# Verify the 90-second relay arena and online recovery

## Verdict

**PASS — 0 findings and 0 untested public claims.**

Linebreak Clash lets friends play a 90-second trail arena, capture relay nodes,
and recover a dropped online player. It is for solo players, two people sharing
a keyboard, or two to four people on separate devices. Before scrolling, fresh
1440×900 desktop and 393×727 touch-browser visits showed the job, the audience,
the playable arena, and **Try it with sample data** as the first action.

## Candidate and scope

- Implementation reviewed: `8498e209db0f9f29641e883a3f3fd5acdac1f409`.
- Documentation baseline reviewed: `a92b2ca6b2123fd715f4517d91010f5b905fa2b9`.
- Live URL: <https://linebreak-clash.sociobot.in>.
- The live JavaScript and CSS exactly matched a clean production build:
  `main--ddsxgKd.js` SHA-256
  `a399d8e72c156774c21ee063cc2855baa484185da9dd89e758ae5153eb5b6f28`,
  and `main-BdThT_9_.css` SHA-256
  `47624f40b8f8a787e16890ee2e2ffba2b5dd66b3eafcb6653c9323f8930a42ba`.

## Clean checkout checks

A fresh clone at `a92b2ca`, Node 22.23.2, and npm 10.9.8 completed `npm ci`
with no vulnerabilities. `CI=1 npm run check` passed: 10 unit tests, realtime
authority/persistence/rate-limit integration, the production build, and 26
Chromium browser tests. `dist/` contains 15.28 KB gzip JavaScript and 4.94 KB
gzip CSS.

The manifest has 30 unique entries. Source audit found exactly one matching
`@claim:<id>` tag for every entry, with no missing, extra, or duplicate tags.
Every declared command below was run separately from that clean checkout.

| Claim | Command | Result and outcome evidence |
| --- | --- | --- |
| free-entry | `npm test -- --grep @claim:free-entry` | Pass — starts local play without identity or payment. |
| round-end | `npm test -- --grep @claim:round-end` | Pass — accelerated 90-second run reaches a result screen. |
| restart-reset | `npm test -- --grep @claim:restart-reset` | Pass — Play again restores 01:30 and zero scores. |
| relay-score | `npm run test:unit -- --testNamePattern @claim:relay-score` | Pass — capture adds two points. |
| collision-score | `npm run test:unit -- --testNamePattern @claim:collision-score` | Pass — opponent receives one point. |
| dash-break | `npm run test:unit -- --testNamePattern @claim:dash-break` | Pass — dash crosses a trail without collision. |
| trail-expiry | `npm run test:unit -- --testNamePattern @claim:trail-expiry` | Pass — aged trail point is removed. |
| play-modes | `npm test -- --grep @claim:play-modes` | Pass — bot moves and separate local keys steer each player. |
| remapped-controls | `npm test -- --grep @claim:remapped-controls` | Pass — J/L/I setting changes steering and dash. |
| pause-controls | `npm test -- --grep @claim:pause-controls` | Pass — button, P, and Escape pause and resume the same run. |
| settings-persist | `npm test -- --grep @claim:settings-persist` | Pass — all four settings restore after reload. |
| sound-feedback | `npm run test:unit -- --testNamePattern @claim:sound-feedback` | Pass — capture and collision tones start. |
| reduce-effects | `npm test -- --grep @claim:reduce-effects` | Pass — control motion and vibration are removed. |
| assist-mode | `npm run test:unit -- --testNamePattern @claim:assist-mode` | Pass — movement slows and safe space increases. |
| refresh-recovery | `npm test -- --grep @claim:refresh-recovery` | Pass — active play continues after refresh. |
| demo-isolation | `npm test -- --grep @claim:demo-isolation` | Pass — real storage records remain unchanged. |
| sample-state | `npm test -- --grep @claim:sample-state` | Pass — 4–2, three captures, trails, relays, 00:56, and reset match. |
| reaction-pings | `npm test -- --grep @claim:reaction-pings` | Pass — preset reaction is visible locally and online. |
| privacy-requests | `npm test -- --grep @claim:privacy-requests` | Pass — only product origins receive runtime requests. |
| clear-saved-data | `npm test -- --grep @claim:clear-saved-data` | Pass — confirmed clearing removes all game keys. |
| offline-play | `npm test -- --grep @claim:offline-play` | Pass — offline reload starts solo and local rounds. |
| mobile-fps | `npm test -- --grep @claim:mobile-fps` | Pass — documented mobile profile reaches at least 50 FPS. |
| touch-controls | `npm test -- --grep @claim:touch-controls` | Pass — touch steers and visible targets measure at least 44 px. |
| online-room | `npm test -- --grep @claim:online-room` | Pass — four independent clients finish and rematch together. |
| copy-invite | `npm test -- --grep @claim:copy-invite` | Pass — clipboard receives the current invite URL. |
| no-open-chat | `npm test -- --grep @claim:no-open-chat` | Pass — no writable chat; three preset reactions only. |
| server-authority | `npm run test:realtime` | Pass — forged score, position, collision, and clock state are rejected. |
| online-payloads | `npm test -- --grep @claim:online-payloads` | Pass — documented browser and room-state payloads observed. |
| online-rejoin | `npm test -- --grep @claim:online-rejoin` | Pass — reconnect succeeds just before 20 seconds. |
| room-persistence | `npm run test:realtime` | Pass — SQLite room survives restart and expires after 24 hours. |

## Live game and sample checks

- The one-click sample opened a populated 4–2 round with the persistent
  **Demo — sample data, nothing is saved** label. Reset restored the seeded
  state. Preloaded real settings were unchanged.
- A deterministic local run reached an actual result screen; its restart
  restored the full round state.
- Fresh phone play had no horizontal overflow and measured 59.5 FPS. Touch
  controls worked. Offline reload started a solo round after service-worker
  control. Reduced-motion controls had no transition movement.
- Two fresh, independent live browser contexts created and joined one room,
  started a full real 90-second round, rejoined a dropped client, and produced
  the same end result: **“Lin wins.”** The end panel used a polite live region
  and moved focus to **Round complete** for both clients. The host then started
  a shared rematch with scores reset to zero.
- End-screen evidence: `/work/.evidence/linebreak-clash/online-end-live.png`.
  Live browser evidence: `/work/.evidence/linebreak-clash/live-browser.json`.
- Product-only backend verification passed: `/health` returned 200 after a
  restart; a two-player active room remained `playing`; a credential from one
  room could not join another; request allowance returned HTTP 429 with
  `Retry-After: 60`.

## Accessibility, routes, privacy, and errors

- Fresh live Axe checks found zero serious or critical violations on `/`,
  `/demo/`, `/online/`, `/privacy/`, `/terms/`, and `/not-a-page`.
- Those routes had `lang="en"`, exactly one `h1`, one `main`, and their correct
  titles. The styled missing route returned the expected HTTP 404 and a way
  back; it is not a finding.
- Keyboard focus was visible on live content and navigation. The primary
  sample action and navigation focus contrast both measured 13.528:1.
- Live run recorded zero console errors. Its only runtime request origins were
  the static product and the product-owned realtime service. No analytics,
  advertising, or third-party origin was observed.
- Normal paths, invalid room-code and missing-room errors, near-boundary
  rejoin, refresh, offline recovery, reset, 200% text reflow, reduced motion,
  legal pages, and 404 handling are covered by the clean browser suite and
  live route checks.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1: incomplete four-player, authority, near-limit rejoin, and sample proof | Fixed and passing under separate tagged commands. |
| Verification 1: Escape pause and sub-44 px touch targets | Fixed and passing under keyboard and mobile target checks. |
| Verification 2: incomplete or unlisted public claims | Fixed: 30 outcome-based claims, all individually passed. |
| Verification 2: 1.09:1 focus outline | Fixed: fresh live measurement is 13.528:1. |
| Verification 2: online result lacked announcement and focus | Fixed: live two-client end screen announced and focused. |

## Known limit

Chromium is the automated and live browser used here. Safari and Firefox remain
manual release checks; the product does not claim cross-browser verification.
