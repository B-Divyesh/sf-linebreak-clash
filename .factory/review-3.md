# Review: Play a 90-second relay arena and rejoin

## Verdict

**PASS — 0 findings of every severity and 0 untested public claims.**

Linebreak Clash lets solo players, two people at one keyboard, or two to four
friends play a 90-second trail arena. Players capture relay nodes, avoid
trails, and can recover after a dropped connection.

## First screen

Before scrolling in fresh 1440×900 desktop and 393×727 phone browsers:

- Job: **Capture relay nodes with a moving trail**.
- Audience: friends who want a quick browser arena on one screen or separate
  devices.
- First action: **Try it with sample data**. It says that it loads a seeded
  round to play now.

The playable arena started at 305.73 px on desktop and 693.98 px on the
727 px-high phone screen. The phone document was exactly 393 px wide. The
three visible facts state that play is free, needs no account or ads, and that
solo and local rounds work offline after the first visit.

## Candidate and deployment

- Runtime implementation reviewed:
  `528bba9e08c63aa507e34853f9ffc8f0c71e90f4`.
- Test-only follow-up reviewed:
  `358df09809aa154470135868711666b019c3866c`.
- Documentation baseline reviewed:
  `2867b537b914ec8f96ad79bc2c3ddc75b2e0cc66`.
- Live URL: <https://linebreak-clash.sociobot.in>.

The commits after `528bba9` change only one test and factory reports. A fresh
build produced `main-BsWgBQYr.js` and `main-uqx63RgO.css`. Their local and live
SHA-256 values matched exactly:

- JavaScript:
  `81425e16bc7119476de0ef5700adfb44922f1a8ef853258fa60cd62181d16202`.
- CSS:
  `41fc7411f6f52baf70dae850309af4f8201a2994ae71a5f28bfa88cc8f18d624`.

The live runtime therefore matches the last implementation candidate. No
product code was changed during this review.

## Clean checkout and public claims

A detached clean checkout at `2867b53` used Node 22.23.2 and npm 10.9.8.
`npm ci` passed with zero reported vulnerabilities. The manifest has 30 unique
claim IDs. Source inspection found exactly one matching `@claim:<id>` tag for
each ID, with no missing, extra, or duplicate tags.

Every declared command was invoked separately:

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

The repeated realtime command was run for both declared entries. Full command
records are in
`/work/.evidence/linebreak-clash-review-3/claim-commands.json`.

`CI=1 npm run check` also passed. It ran 10 unit tests, the product-owned
SQLite/realtime integration, a production build, and 26 Chromium tests.
`dist/` contains 15.28 KB gzip JavaScript and 4.96 KB gzip CSS.

The live UI, README, privacy and terms pages, sample guide, copy audit, and
catalog copy were compared with the manifest. Every statement a visitor can
rely on is covered by an outcome test. No AI-assisted feature is implied by
the researched job; deterministic play and reliable group recovery are the
complete useful loop.

## Sample, local game, and recovery

- One click opened `/demo/` at 4–2 with 00:56 remaining, three captures, two
  visible 16-point trails, and three active relays.
- **Demo — sample data, nothing is saved** remained visible. **Reset demo**
  restored 4–2 and 00:56. Seeded settings, round, and room values were
  unchanged while entering and resetting the sample. **Start for real** left
  sample mode.
- A deterministic run reached **The bot wins.** at 17–77. **Play again** had
  focus and restarted at 01:30 and 0–0.
- Escape paused and resumed the active run without resetting it. The complete
  clean suite also passed P, the Pause button, remapped controls, assist,
  sound, reduced effects, scoring, dash, and temporary trails.
- A fresh phone used touch steering and measured 60.00 FPS, above the public
  50 FPS threshold.
- An offline reload under service-worker control started a solo round. The
  product does not make a separate update-behavior promise.
- Reduced-motion mode set control transition and animation duration to
  0.00001 seconds. At 320 px with 200% root text, document width remained
  320 px and the sample action stayed visible.
- Invalid `BAD` input said to enter the eight-character room code. A valid but
  missing code said to check the code. Settings persisted across reload.
- The privacy confirmation held focus in its dialog, removed all three saved
  record types, and announced completion.

## Live multiplayer and backend

Two independent real clients used a 1440×900 desktop host and a 393×727 touch
guest. Both joined one live room with the valid 20-character names
`Alexandra-Team-Alpha` and `Christopher-Player-2`.

- The phone document and roster were both 393 px and 343 px wide respectively.
  Both cards stayed between 25 px and 368 px, so the previous overflow did not
  recur.
- The room started at 01:30. Touch steering worked, and a preset reaction from
  the host appeared for the guest.
- Only the confirmed product revision
  `sf-linebreak-clash-realtime--0000005` was deactivated and activated. Both
  clients reconnected to the same active room. `/health` then returned 200.
- The guest closed for 19.15 seconds and rejoined the same active room.
- Both clients completed the real 90-second round with
  **Christopher-Player-2 wins.** The result had `aria-live="polite"`, and the
  **Round complete** heading received focus.
- A shared rematch reset the timer to 01:30 and both scores to zero.
- A credential created for one room was rejected in a second room with close
  code 4003 and **Room or rejoin key is not valid.**
- The live HTTP allowance returned 429 with `Retry-After: 60`.

The clean integration independently passed four-player capacity, fifth-player
rejection, forged-state rejection, 20/20 reconnects, SQLite restart
persistence, 24-hour expiry, health, and rate limiting.

## Accessibility, routes, privacy, and performance

- `/`, `/demo/`, `/online/`, `/privacy/`, and `/terms/` returned 200 with the
  intended route title, `lang="en"`, one `h1`, one `main`, a header, a footer,
  and complete image alternatives.
- `/not-a-page` returned the deliberate HTTP 404 with title
  **Page not found — Linebreak Clash** and a way back. This expected 404 is not
  a defect.
- Fresh Axe runs found zero violations on all five real routes and the designed
  404.
- Skip navigation was the first keyboard target. Browser back restored focus
  to the route heading. Content and navigation focus rings both measured
  13.528:1.
- Every visible phone link and control measured at least 44×44 px. There were
  no keyboard traps or unexpected console errors.
- Every ordinary page link returned 200. The missing-page self-link returned
  its expected 404, and the privacy email is an explicit `mailto:` link.
- Game and sample requests used only the static product origin and its
  product-owned realtime origin. No analytics, advertising, CDN font, or
  unrelated runtime origin was observed.
- CSP, HSTS, content-type, referrer, permissions, frame, and opener response
  restrictions were present. `robots.txt`, `sitemap.xml`, and the manifest
  returned 200.
- Fresh mobile Lighthouse scored 100 for Performance, Accessibility, Best
  Practices, and SEO. LCP was 1.119 seconds, CLS was 0, and TBT was 0 ms.

## Earlier finding disposition

| Earlier finding | Fresh disposition |
| --- | --- |
| Pre-verification offline recovery and stale cached shell | Fixed; fresh service-worker-controlled offline reload started play. |
| Pre-verification remapped controls and dark-section contrast | Fixed; claim command, live settings persistence, Axe, and contrast checks passed. |
| Pre-verification unstable end-screen evidence | Fixed; fresh local and real online end screens were recorded. |
| Pre-verification arena below the phone fold | Fixed; the live arena began at 693.98 px in a 727 px viewport. |
| Pre-verification 200% text overflow | Fixed; the 320 px document remained 320 px wide. |
| Pre-verification SQLite startup and network-lock failures | Fixed; clean integration and live health/restart checks passed. |
| Pre-verification rejoin grace after restart | Fixed; the active room survived the product restart and the 19.15-second rejoin passed. |
| Verification 1 F-01: incomplete claim coverage | Fixed; all 30 unique outcome claims passed separately. |
| Verification 1 F-02: Escape did not pause | Fixed; Escape paused and resumed fresh live play. |
| Verification 1 F-03: targets below 44×44 px | Fixed; fresh live phone measurements found none. |
| Verification 2 F-01: ten unlisted or incomplete claims | Fixed; all public copy maps to the 30 passing claims. |
| Verification 2 F-02: 1.09:1 content focus outline | Fixed; both live focus contexts measured 13.528:1. |
| Verification 2 F-03: online result not announced or focused | Fixed; the fresh shared result was polite and focused in both clients. |
| Review 2 F-01: populated phone room overflow | Fixed; two 20-character names fit both live clients without overflow. |

## Evidence and limits

- Fresh evidence root: `/work/.evidence/linebreak-clash-review-3/`.
- Browser results: `live-review.json`.
- First screens: `desktop-first-screen.png` and `phone-first-screen.png`.
- Sample and end screens: `sample-populated.png`, `local-end-screen.png`, and
  `online-end-phone.png`.
- Populated phone room: `phone-populated-room.png`.
- Backend, link, focus, privacy, and Lighthouse results:
  `backend-live.json`, `links.json`, `focus-contrast.json`,
  `privacy-clear.json`, and `lighthouse.json`.

The separately named
`factory-evidence/linebreak-clash-verify-4/qa-report.md` was not mounted in this
disposable workspace. The complete committed `.factory/verification-4.md` was
read as the prior report, and all acceptance paths above were checked again
from fresh state. Chromium was used for automated and live checks. Safari and
Firefox are not public claims. The research targets for field reconnect rate
and median rounds remain success measures, not public product promises; the
privacy-first product does not collect behavioral analytics.
