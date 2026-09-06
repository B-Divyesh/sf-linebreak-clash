# Verify a 90-second relay arena and reconnection

## Verdict

**FAIL — 3 findings: 1 major and 2 minor. Ten public claim components are
untested or incompletely tested.**

The job is to play a 90-second trail arena, capture relay nodes, recover from a
dropped connection, and finish on a shared result screen. The audience is
pairs or small groups who want a quick browser game. Before scrolling, fresh
desktop and 393×727 phone contexts showed the job, the audience, **Try it with
sample data** as the first action, and the live arena. On the phone, the arena
began at 694 CSS px in a 727 CSS px viewport.

## Candidate and live version

- Implementation candidate reviewed:
  `54b09c184e48dffdba3b2e03a4124be0f198edb5`.
- Documentation baseline reviewed:
  `87d78ccc3eaa8110241d304bf358f6b9115b06d0`.
- The baseline documentation differs from the implementation because
  `f5205ab` and `87d78cc` are handoff-only commits.
- Live URL: `https://linebreak-clash.sociobot.in`.
- The live `main-s9MjsHDY.js` and `main-BeP9VOYS.css` SHA-256 values matched a
  fresh candidate build exactly.
- The live room service used image tag `54b09c184e48` at revision
  `sf-linebreak-clash-realtime--0000005`, with one configured replica.

## Findings

### F-01 — Major — The claim manifest still does not cover all public promises

All 22 declared commands pass, and the repairs add solid proof for the five
specific missing components identified in verification 1. The broader public
claim audit still found ten unlisted or incompletely tested components:

1. The online page says **No account or open chat**, but no claim or tagged
   test covers the absence of open chat. This was included in verification 1's
   broader list and remains unresolved.
2. The README and online UI advertise sharing and copying an invite link. The
   online-room test constructs a room URL itself and never exercises **Copy
   invite**.
3. The README calls trails temporary. Trail expiry has an untagged unit test,
   but no manifest entry or `@claim` test.
4. The live how-to says dash stops drawing briefly. `dash-break` proves that a
   dashing player survives a crossing, but it never proves that drawing stops
   or that a trail gap is created.
5. The Sound setting says it plays capture and collision tones. No claim test
   causes either event and observes audio behavior.
6. The Reduce effects setting says it removes panel movement and vibration.
   Persistence and operating-system reduced motion are tested, but the setting's
   advertised effect is not.
7. The Assist setting says it slows trails and adds collision space. The test
   only proves that the checkbox persists.
8. The visible preset reaction controls promise local and shared online
   reactions. No manifest entry or tagged test exercises them.
9. `demo-isolation` promises that the sample never reads or changes saved game
   data, but its tagged test preloads only the settings key. It does not protect
   a valid active-round key or online-room key, nor does it inspect IndexedDB or
   OPFS as the demo guide states. Fresh live QA independently proved the three
   real local-storage records remain unchanged, but the release claim command
   remains incomplete.
10. The privacy page states which fields online play sends to the room service,
    but no claim records or inspects those payload categories. The copy says
    scores and room state are sent *to* the service, while the implementation's
    authority model sends player input to the service and receives scores and
    room state from it. The disclosure and the server-authority wording do not
    agree.

The claims contract requires each public statement to have one tagged,
outcome-based test. Passing undeclared manual checks does not make those claims
part of the release gate. This finding sets `untested_claim_count` to **10**.

### F-02 — Minor — The content focus ring misses the required contrast

Focused links and controls use a 4 px `#d7f13b` outline with a 3 px offset. On
the main paper background `#f3eddf`, that outline has a measured contrast ratio
of **1.09:1**, below the required 3:1. The focused **Try it with sample data**
capture shows almost no visible change from its unfocused state. The same token
is clear against the navy header and blue buttons, but the offset places its
outer and inner edges against the paper on content controls.

Evidence: `/work/.evidence/linebreak-clash/focus-ring-live.png` and the live
computed values `outline: rgb(215, 241, 59) solid 4px`.

### F-03 — Minor — The online round result is not announced

The live four-player round reached the correct shared end screen, but
`#online-end`, `#online-result`, and `#online-status-text` have no `role` or
`aria-live` attribute. The online controller does not move focus to the result
heading or **Play another round** button. A screen-reader user receives no
automatic result announcement when the asynchronous server snapshot ends the
round. The local end screen does move focus to **Play again**, so the two modes
do not have equivalent result handling.

A live DOM check returned `null` for role and `aria-live` on all three online
result/status elements. The completed-round capture also shows focus remaining
outside the result panel.

## Declared claim commands

The clean checkout used Node 22.23.2 and npm 10.9.8. `npm ci` completed with
zero vulnerabilities. Every command below was run individually, including the
same realtime command twice because two manifest entries declare it.

| Claim | Result |
| --- | --- |
| `free-entry` | Pass |
| `round-end` | Pass |
| `restart-reset` | Pass |
| `relay-score` | Pass |
| `collision-score` | Pass |
| `dash-break` | Pass for the declared crossing assertion; incomplete public trail-gap promise in F-01 |
| `play-modes` | Pass |
| `remapped-controls` | Pass |
| `pause-controls` | Pass |
| `settings-persist` | Pass for persistence; incomplete behavior promises in F-01 |
| `refresh-recovery` | Pass |
| `demo-isolation` | Pass for the settings fixture; incomplete saved-data coverage in F-01 |
| `sample-state` | Pass |
| `privacy-requests` | Pass for request origins; incomplete payload disclosure in F-01 |
| `clear-saved-data` | Pass |
| `offline-play` | Pass |
| `mobile-fps` | Pass |
| `touch-controls` | Pass |
| `online-room` | Pass |
| `server-authority` | Pass |
| `online-rejoin` | Pass |
| `room-persistence` | Pass |

Each declared ID appears exactly once in the test sources. No declared command
was skipped or failed. The ten public components in F-01 are outside, or only
partly covered by, those declared commands.

## Product paths checked

### Sample and local play

- The landing action opened `/demo/` in one click. The persistent banner said
  **Demo — sample data, nothing is saved**.
- The live sample showed 4–2, 00:56, three captures, two 16-point trails, and
  three active relays. Reset restored the same populated state.
- A valid real settings record, active-round snapshot, and online-room key were
  unchanged after entering and resetting the sample. **Start for real** returned
  home without creating demo storage.
- Solo, local two-player, A/D, arrow keys, J/L/I remapping, touch steering,
  pause button, P, Escape, settings persistence, refresh recovery, offline
  reload, restart, scoring, dash crossing, reactions, and clear-data recovery
  all worked.
- A deterministic accelerated local run reached a win/loss screen and **Play
  again** reset the timer and scores.

### Live online play and backend

- Four independent live browser contexts joined one room. One client was closed
  for 19.15 seconds and rejoined the still-active room.
- All four clients completed the real 90-second round with the shared result
  **The round is a draw.** A rematch reset all four scores to zero.
- The invite button copied a working room URL. A preset reaction sent by one
  client appeared in another client.
- A short code explained the eight-character requirement. A well-formed missing
  code returned **Room not found. Check the code.** A fifth local integration
  client received 409.
- The live health endpoint returned 200. A two-player active room survived a
  cycle of only the product's current revision and restored both players in
  `playing` state.
- A room token failed in another room. The live allowance returned 429 with
  `Retry-After: 60`.
- Local integration rejected forged score, collision, position, and clock
  fields, reopened SQLite state after restart, and removed a room aged beyond
  24 hours.

End-screen evidence:
`/work/.evidence/linebreak-clash/four-player-end-live.png` and
`/work/.evidence/linebreak-clash/four-player-live.json`.

## Structure, accessibility, links, and privacy

- `/`, `/demo/`, `/online/`, `/privacy/`, and `/terms/` returned 200. The
  deliberately missing route returned the expected styled HTTP 404 and is not
  a defect.
- Every route had its expected title, `lang="en"`, one `h1`, one `main`, a
  header, a footer, labels, and image alternatives. The standard URL verifier
  passed all five real routes with no console errors.
- Live Axe checks found zero serious or critical violations on the five real
  routes and the 404. F-02 and F-03 require manual checks and are not detected
  by Axe.
- Skip navigation, modal containment, history/back heading focus, reduced
  motion, 44×44 phone targets, touch input, and 320 px layout at 200% text
  passed. The native modal briefly gives document focus to `body` while Tab
  wraps, but no background interactive element receives focus.
- All internal links and the external Param Factory link returned their
  expected status. The email action is an explicit `mailto:` link. Favicon,
  app icon, manifest, and 1200×630 social image returned 200.
- Live sample and room activity contacted only the static product origin and
  `linebreak-clash-realtime.sociobot.in`; there were no analytics, advertising,
  CDN-font, or unrelated requests.
- CSP, HSTS, content-type, referrer, permissions, and frame restrictions were
  present as response headers.

## Build and performance

- `CI=1 npm run check`: pass — 8 unit tests, realtime integration, production
  build, and 20 browser tests.
- `dist/`: produced; JavaScript 15.16 KB gzip and CSS 4.91 KB gzip.
- Fresh live phone rendering: 60.0 FPS.
- Lighthouse mobile rerun: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; LCP 1.161 s, CLS 0, TBT 0 ms.
- The first Lighthouse attempt wrote a complete report but then reported a
  browser-tab crash. A clean rerun with `--disable-dev-shm-usage` exited zero;
  its metrics above are the reported evidence.

## Earlier finding disposition

| Earlier issue | Current disposition |
| --- | --- |
| Four-player completion | Fixed: local claim and fresh four-client live 90-second round pass. |
| Server authority | Fixed: forged client state is rejected. |
| Near-20-second rejoin | Fixed: local claim and fresh 19.15-second live rejoin pass. |
| Unprovable random-code wording | Fixed: the word was removed. |
| Full sample state and exact reset | Fixed and independently reproduced live. |
| Other missing public claims, including no open chat | Not fully fixed; F-01. |
| Escape pause | Fixed live and in its tagged claim test. |
| Mobile links below 44×44 | Fixed on every public route. |
| Offline and refresh recovery | Still passing. |
| Arena below the phone fold | Still fixed; the arena starts at 694 px in a 727 px viewport. |
| 200% text overflow | Still fixed at 320 px width. |
| SQLite startup, restart, isolation, health, and allowance | Still passing locally and live. |

## Evidence

- `/work/.evidence/linebreak-clash/live-browser.json`
- `/work/.evidence/linebreak-clash/manual-live.json`
- `/work/.evidence/linebreak-clash/sample-live.json`
- `/work/.evidence/linebreak-clash/four-player-live.json`
- `/work/.evidence/linebreak-clash/first-screen-desktop.png`
- `/work/.evidence/linebreak-clash/first-screen-phone.png`
- `/work/.evidence/linebreak-clash/sample-reset-live.png`
- `/work/.evidence/linebreak-clash/four-player-end-live.png`
- `/work/.evidence/linebreak-clash/focus-ring-live.png`
- `/work/.evidence/linebreak-clash/lighthouse-final.json`
- `/work/.evidence/linebreak-clash/url-*`

No product code was modified during this verification.
