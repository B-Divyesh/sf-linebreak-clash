# Verify the 90-second relay arena and dropped-player recovery

## Verdict

**PASS — 0 findings and 0 untested public claims.**

Linebreak Clash lets solo players, two people at one keyboard, or two to four
friends play a 90-second trail arena. Players capture relay nodes, avoid trails,
and can recover after a short connection loss. Fresh 1440×900 desktop and
393×727 phone browsers showed this job, the audience, the playable arena, and
**Try it with sample data** before scrolling. The sample link is the first main
action.

## Candidate and deployment

- Runtime implementation reviewed:
  `528bba9e08c63aa507e34853f9ffc8f0c71e90f4`.
- Test-only follow-up reviewed:
  `358df09809aa154470135868711666b019c3866c`. It changes only the
  demo-isolation test setup and does not change the built product.
- Prior verification-document baseline:
  `ab2f3efafe0dff5b26b6a38b33eab31daffe49bb`.
- Checkout and documentation baseline:
  `6bdda6f6ccebcbcbeeefa07ac87c4c5866715aae`.
- Live URL: <https://linebreak-clash.sociobot.in>.

The fresh build produced `main-BsWgBQYr.js` with SHA-256
`81425e16bc7119476de0ef5700adfb44922f1a8ef853258fa60cd62181d16202`
and `main-uqx63RgO.css` with SHA-256
`41fc7411f6f52baf70dae850309af4f8201a2994ae71a5f28bfa88cc8f18d624`.
Cold HTTPS copies matched both hashes. The later commits contain only tests or
reports, so the live product matches the last implementation candidate.

## Clean checkout and claim commands

Node 22.23.2 and npm 10.9.8 ran `npm ci` with zero reported vulnerabilities.
The manifest contains 30 unique claim IDs. Source inspection found exactly one
matching `@claim:<id>` tag for each ID, with no missing, extra, or duplicate
tags. Every declared command was then invoked separately.

| Claim | Declared command | Result |
| --- | --- | --- |
| `free-entry` | `npm test -- --grep @claim:free-entry` | Pass |
| `round-end` | `npm test -- --grep @claim:round-end` | Pass |
| `restart-reset` | `npm test -- --grep @claim:restart-reset` | Pass |
| `relay-score` | `npm run test:unit -- --testNamePattern @claim:relay-score` | Pass |
| `collision-score` | `npm run test:unit -- --testNamePattern @claim:collision-score` | Pass |
| `dash-break` | `npm run test:unit -- --testNamePattern @claim:dash-break` | Pass |
| `trail-expiry` | `npm run test:unit -- --testNamePattern @claim:trail-expiry` | Pass |
| `play-modes` | `npm test -- --grep @claim:play-modes` | Pass |
| `remapped-controls` | `npm test -- --grep @claim:remapped-controls` | Pass |
| `pause-controls` | `npm test -- --grep @claim:pause-controls` | Pass |
| `settings-persist` | `npm test -- --grep @claim:settings-persist` | Pass |
| `sound-feedback` | `npm run test:unit -- --testNamePattern @claim:sound-feedback` | Pass |
| `reduce-effects` | `npm test -- --grep @claim:reduce-effects` | Pass |
| `assist-mode` | `npm run test:unit -- --testNamePattern @claim:assist-mode` | Pass |
| `refresh-recovery` | `npm test -- --grep @claim:refresh-recovery` | Pass |
| `demo-isolation` | `npm test -- --grep @claim:demo-isolation` | Pass |
| `sample-state` | `npm test -- --grep @claim:sample-state` | Pass |
| `reaction-pings` | `npm test -- --grep @claim:reaction-pings` | Pass |
| `privacy-requests` | `npm test -- --grep @claim:privacy-requests` | Pass |
| `clear-saved-data` | `npm test -- --grep @claim:clear-saved-data` | Pass |
| `offline-play` | `npm test -- --grep @claim:offline-play` | Pass |
| `mobile-fps` | `npm test -- --grep @claim:mobile-fps` | Pass |
| `touch-controls` | `npm test -- --grep @claim:touch-controls` | Pass |
| `online-room` | `npm test -- --grep @claim:online-room` | Pass |
| `copy-invite` | `npm test -- --grep @claim:copy-invite` | Pass |
| `no-open-chat` | `npm test -- --grep @claim:no-open-chat` | Pass |
| `server-authority` | `npm run test:realtime` | Pass |
| `online-payloads` | `npm test -- --grep @claim:online-payloads` | Pass |
| `online-rejoin` | `npm test -- --grep @claim:online-rejoin` | Pass |
| `room-persistence` | `npm run test:realtime` | Pass |

The repeated realtime command was run for each of its two declared entries.
The complete output is in
`/work/.evidence/linebreak-clash-verify-4/claim-commands.log`.

`CI=1 npm run check` also passed. It ran 10 unit tests, the SQLite/realtime
integration, a production build, and 26 Chromium tests. `dist/` contains
15.28 KB gzip JavaScript and 4.96 KB gzip CSS.

The live UI, README, privacy and terms pages, demo guide, and catalog copy were
cross-checked against the manifest. No public promise is absent from the claim
set or only partly tested.

## Live game, sample, and recovery checks

- One click opened the populated sample at 4–2 with 00:56 remaining, visible
  trails, three relays, and the persistent **Demo — sample data, nothing is
  saved** label. Reset restored the sample. **Start for real** left sample mode.
  Preloaded real settings and room data did not change. The claim test also
  protected an active round, IndexedDB, and OPFS data.
- A deterministic live run started at 01:30 and reached **The bot wins.** with
  final score 23–74. **Play again** received focus and restarted active play at
  90 seconds and 0–0. P and Escape paused and resumed the same run.
- A fresh 393×727 touch browser steered the active player and measured
  **59.50 FPS**, above the public 50 FPS threshold.
- Solo play reloaded and started offline after service-worker control. A live
  service-worker update completed, and the `linebreak-clash-v8` cache existed.
- Reduced-motion mode removed control transition motion. At 320 px with 200%
  root text, document width remained 320 px and the sample action stayed
  visible.
- Two independent live clients completed a real 90-second online round. Both
  showed **Lin wins.**; the polite result was announced and **Round complete**
  received focus. A shared rematch reset the timer and both scores.
- A separate boundary run closed the guest for 19.15 seconds and restored it
  to the same active room. Short and well-formed missing room codes produced
  specific recovery messages.
- The populated-room repair passed in two fresh 393 px clients using
  `Alexandra-Team-Alpha` and `Christopher-Player-2`. Each document was exactly
  393 px wide. Each roster was 343 px wide with 343 px content, and both cards
  stayed between 25 px and 368 px with full names, state, and score visible.

## Live backend

Only the product-owned `sf-linebreak-clash-realtime` service was exercised.
After its current revision was cycled, `/health` returned 200 and the active
two-player room restored in `playing` state. A credential from one room could
not enter another room. Repeated allowed-origin requests reached HTTP 429 with
`Retry-After: 60`.

The clean integration test separately confirmed four-player capacity, rejection
of a fifth player, 20/20 reconnects, forged-state rejection, SQLite restart
persistence, and removal after 24 hours without activity.

## Accessibility, routes, privacy, and performance

- The standard URL verifier passed `/`, `/demo/`, `/online/`, `/privacy/`, and
  `/terms/`. Each returned 200 with its intended title, `lang="en"`, one `h1`,
  one `main`, a header and footer, labelled controls, image alternatives, and
  no console or page errors.
- The designed `/not-a-page` returned HTTP 404 with the title **Page not found —
  Linebreak Clash** and a route home. Chromium logged the expected failed-load
  message for that deliberate 404; it is not a product error.
- Fresh Axe integration checks found zero violations on all five real routes
  and the designed 404. Content and navigation focus contrast both measured
  13.528:1. Skip navigation, route focus, native dialog focus, keyboard play,
  live errors, touch targets, and result announcements passed.
- All ordinary internal and external links returned 200. The only 404 was the
  deliberate missing-page route and its own skip-link target.
- Confirmed privacy clearing removed settings, active-round data, and room
  keys. Runtime requests used only the static product and its product-owned
  realtime service. No analytics, advertising, CDN font, or unrelated origin
  was observed.
- Security headers include CSP, HSTS, `X-Content-Type-Options`, referrer,
  permissions, frame, and opener restrictions. `robots.txt`, `sitemap.xml`,
  and the web manifest returned 200.
- Fresh mobile Lighthouse scores were Performance 100, Accessibility 100,
  Best Practices 100, and SEO 100. LCP was 1.10 seconds, CLS was 0, and TBT was
  0 ms.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Pre-verification offline recovery and stale cached shell | Fixed; fresh live offline reload and service-worker update passed. |
| Pre-verification remapped controls and dark-section contrast | Fixed; remapped input passed and live Axe/contrast checks passed. |
| Pre-verification unstable end-screen evidence | Fixed; fresh local and real online end screens were recorded. |
| Pre-verification arena below the phone fold | Fixed; the arena is visible on the 393×727 first screen. |
| Pre-verification 200% text overflow | Fixed; a 320 px document remained 320 px wide. |
| Pre-verification SQLite startup and network-lock failures | Fixed; clean integration and live health/restart checks passed. |
| Pre-verification rejoin grace after restart | Fixed; live restart persistence and the 19.15-second rejoin passed. |
| Verification 1 F-01: incomplete claim coverage | Fixed; 30 unique outcome claims passed separately, including four clients, authority, boundary rejoin, and exact sample state. |
| Verification 1 F-02: Escape did not pause | Fixed; Escape and P pause/resume passed live and in the tagged test. |
| Verification 1 F-03: targets below 44×44 px | Fixed; all visible links and controls passed the mobile target check. |
| Verification 2 F-01: ten unlisted or incomplete claim components | Fixed; the expanded 30-claim manifest and outcome tests passed. |
| Verification 2 F-02: 1.09:1 content focus outline | Fixed; content and navigation focus measured 13.528:1. |
| Verification 2 F-03: online result not announced or focused | Fixed; the real shared result was polite and focused for both clients. |
| Review 2 F-01: populated 393 px room overflow | Fixed; two 20-character names fit both live phone clients with no overflow. |

## Evidence and limits

- Fresh evidence root: `/work/.evidence/linebreak-clash-verify-4/`.
- Local deterministic end screen: `deterministic-end-live.png` and
  `live-deterministic.json`.
- Populated phone room: `populated-phone-room-live.png` and
  `live-phone-boundary.json`.
- Live route, Axe, focus, link, storage, update, and reflow results:
  `live-structure.json`.
- Real online end screen and run record:
  `/work/.evidence/linebreak-clash/online-end-live.png` and
  `/work/.evidence/linebreak-clash/live-browser.json`.
- Lighthouse result: `lighthouse.json`.

Chromium was used for automated and live checks. Safari and Firefox are not
claimed. The brief's 95% field reconnect target and median four rounds per
group remain research success measures, not public claims; this privacy-first
product does not collect behavioral analytics.
