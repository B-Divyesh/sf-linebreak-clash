# Verify 90-second relay arena play and recovery

## Verdict

**FAIL — 3 findings, including 1 major and 2 minor. Five public claim
components do not have complete claim-test proof.**

The job is to play a short trail arena, capture relay nodes, recover from a
dropped connection, and finish on a clear result screen. The audience is pairs
or small groups who want a quick browser game. Before scrolling, a fresh
desktop browser and a fresh 393×727 phone browser showed the job, the audience,
the live arena, and **Try it with sample data** as the first action.

## Candidate and live version

- Implementation candidate reviewed:
  `23e5b9ef0cee5d9d17f6faa9ade8e6facfb36032`.
- Documentation examined: the same `23e5b9e` checkout. This verification and
  its handoff update are report-only changes made after the review.
- Verification documentation commit:
  `44dca4be7813c0c76412aa466d09e6ad118d55dd` (the report-only commit; the
  following pointer-only commit records this SHA).
- Static implementation recorded by the handoff: `5ff1528`.
- Realtime implementation recorded by the handoff and exercised live:
  `19f41ed`.
- Live URL: `https://linebreak-clash.sociobot.in`.
- Live JavaScript and CSS SHA-256 values exactly matched a fresh candidate
  build (`main-B7Cx4pxz.js` and `main-ClWMd5v7.css`). Later report-only commits
  do not require a new product image.

## Findings

### F-01 — Major — Public claims are missing or incompletely proved

`.factory/claims.json` has 15 entries and every declared command passes, but it
does not cover every public promise. Some missing promises have untagged tests;
five promise components remain incompletely tested:

1. `online-room` says two to four players finish the same round, but its tagged
   browser test uses only two clients. The integration test proves four-player
   capacity, not a completed four-client round.
2. The same claim says play is server-authoritative, but no claim test attempts
   a client-authored position, score, collision, or clock change and proves the
   server rejects it.
3. `online-rejoin` promises a 20-second window, but the tagged test reloads
   immediately. It does not test a reconnect near the stated boundary.
4. The README calls room codes random. The test checks the eight-character
   alphabet and length, not unpredictability, and no claim entry lists this
   security promise.
5. The sample promises three captures, visible trails, relay positions, 56
   seconds, and an exact reset. The tagged demo test asserts the 4–2 score and
   saved-setting isolation, but not all promised sample state or reset fields.

Other public statements are absent from the manifest even where general tests
or this verification exercise them: touch and pause controls, working J/L/I
controls, deterministic bot behavior, one collision point, shared rematch,
absence of chat/profile/ranking, and clearing every saved key. The claims
contract requires each public claim to appear in the manifest with one tagged
outcome test.

Reproduce by comparing `.factory/claims.json` with `README.md`, `src/main.ts`,
and the tagged tests in `tests/`. This finding sets
`untested_claim_count` to **5**.

### F-02 — Minor — Escape does not pause an active round

The README advertises “press P or Escape” to pause. In a fresh live Chromium
desktop context, start Solo and press Escape. The round remains `playing` and
the pause dialog is closed. Pressing P opens the dialog, and the Pause button
also works.

The keydown handler opens the dialog during the Escape event. That same event
then cancels the native dialog, so the round immediately resumes. The browser
suite checks the Pause button but does not check the advertised Escape entry
path.

### F-03 — Minor — Several phone touch targets are under 44×44 px

At 393×727, measured live targets below the required size include:

- the home wordmark: 106.7×26.2 px;
- the Play navigation link: 38×44 px;
- **Start for real** in the sample banner: 83.2×20.3 px;
- the privacy email: 161.8×19 px;
- footer Privacy, Terms, and Param Factory links: 24.8 px high.

Primary game buttons and steering controls meet the size requirement. The
finding applies to the smaller navigation and text links on every route.

## Declared claim commands

All commands were run individually from the clean `23e5b9e` checkout after
`npm ci` with Node 22.23.2 and npm 10.9.8.

| Claim | Result |
| --- | --- |
| `free-entry` | Pass, 1 browser test |
| `round-end` | Pass, 1 browser test |
| `restart-reset` | Pass, 1 browser test |
| `relay-score` | Pass, 1 unit test |
| `dash-break` | Pass, 1 unit test |
| `play-modes` | Pass, 1 browser test |
| `settings-persist` | Pass, 1 browser test |
| `refresh-recovery` | Pass, 1 browser test |
| `demo-isolation` | Pass, 1 browser test |
| `privacy-requests` | Pass, 1 browser test |
| `offline-play` | Pass, 1 browser test |
| `mobile-fps` | Pass, 1 browser test |
| `online-room` | Pass as written by the test, but incomplete; see F-01 |
| `online-rejoin` | Pass as written by the test, but incomplete; see F-01 |
| `room-persistence` | Pass, realtime integration |

Every claim ID occurs exactly once in the test sources. There were no command
failures and no declared command was skipped. The five incomplete public claim
components in F-01 remain untested for acceptance purposes.

## Product paths checked

### Sample and local play

- The one-click sample opened `/demo/` with a persistent **Demo — sample data,
  nothing is saved** label, score 4–2, and timer 00:56.
- Reset restored 4–2 and 00:56. Preloaded real settings, round data, and an
  online key were unchanged. Sample settings opened with independent defaults.
- Solo, local two-player, keyboard, remapped J/L/I input, touch steering,
  assist, sound, reduced effects, pause button, P pause, refresh recovery, an
  expired local snapshot, and offline reload passed. Escape pause is F-02.
- A deterministic accelerated run reached a win/loss screen. Restart returned
  to 01:30 and 0–0.

### Live online play and backend

- Two independent fresh browser contexts created and joined a live room.
- The guest rejoined during active play. Both clients completed the full real
  90-second round and showed **Lin wins.** A rematch reset both scores to zero.
- Fresh end-screen evidence:
  `/work/.evidence/linebreak-clash/online-end-live.png`.
- `/health` returned 200. An active two-player room remained `playing` with both
  players after the product-owned revision was stopped and started.
- A room token failed in a different room. The live request allowance returned
  429 with `Retry-After: 60`.
- The local integration also accepted four players, rejected a fifth with 409,
  completed 20/20 reconnect attempts, reopened the SQLite file after restart,
  and removed a record aged past 24 hours.

### Invalid, boundary, recovery, and privacy paths

- A short room code explained that eight characters are required. A missing
  room said to check the code.
- The settings dialog kept focus inside the native modal. P paused, Escape
  resumed an already-open pause dialog, and history back restored the route
  title and focused heading.
- The privacy confirmation removed settings, active-round, and online-room
  keys and announced completion.
- Offline solo and local modes started after a controlled offline reload.
- At 320 px with 200% root text, horizontal width remained 320 px and the
  sample action stayed visible.

## Structure, accessibility, links, and privacy

- `/`, `/demo/`, `/online/`, `/privacy/`, and `/terms/` returned 200. The test
  missing route returned the expected styled HTTP 404 with a way home.
- Every route had its own title, `lang="en"`, one `h1`, one `main`, ordered
  headings, header, footer, canonical URL where appropriate, and no missing
  image alternatives.
- The standard URL verifier found no console or page errors on all five real
  routes. The full live run also recorded zero console errors.
- Axe CLI 4.10.3 reported zero violations on the five real routes and the 404.
  A matching Chrome 145 and ChromeDriver 145 pair was installed after the
  first CLI attempt correctly reported that no compatible system Chrome was
  present.
- Keyboard skip navigation, visible 4 px focus, native dialog focus, form
  labels, live errors, reduced motion, forced recovery, and 200% text reflow
  passed. Touch target size is F-03.
- Every internal and external page link returned 2xx, except the deliberate
  missing-page URL which returned 404. The privacy email is an explicit
  `mailto:` link.
- Runtime requests during sample and online play used only the product static
  origin and its product-owned realtime origin. There were no analytics,
  advertising, CDN font, or third-party game requests.
- CSP, HSTS, content-type, referrer, permissions, and frame restrictions were
  present as response headers.

## Build and performance

- `npm ci`: pass, zero reported vulnerabilities.
- `npm run check`: pass; unit 8/8, browser 17/17, realtime integration pass,
  and `dist/` produced.
- Build output: 15.13 KB gzip JavaScript and 4.88 KB gzip CSS.
- Fresh live phone measurement: 60 FPS.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.137 s, CLS 0, TBT 0 ms.

## Earlier finding disposition

No earlier review report is present in the repository. The fix commits and
handoff identify the earlier issues below; each current disposition was
checked independently.

| Earlier issue | Current disposition |
| --- | --- |
| Offline recovery and game controls | Fixed for refresh, offline play, pause button, P, touch, and remapped keys. Escape remains F-02. |
| Remappable controls and dark-section contrast | Remap persists and operates; axe reports zero violations. |
| Offline asset-cache matching and stale shell | Offline reload starts both local modes from the live site. |
| Stable end-screen evidence | Fresh local and live online end screens recorded. |
| Arena below the phone fold | Arena is visible on the first 393×727 screen and the full game is directly below the job copy. |
| Enlarged mobile text overflow | 320 px at 200% text has no horizontal overflow. |
| SQLite startup and network-lock failures | Product-owned SQLite integration and live restart persistence pass. |
| Rejoin grace after restart | Live room restores both players and remains active after restart. |

The research targets of 95% field reconnect reliability and a median four
rounds per group still need real usage. They are research success measures, not
public product claims, and privacy defaults intentionally avoid behavioral
tracking. They do not change this verdict; the three findings above do.

## Evidence

- Fresh evidence directory: `/work/.evidence/linebreak-clash/`.
- Fresh full-round result: `live-browser.json` and `online-end-live.png`.
- Route verifier output and phone/desktop captures: `url-*` directories.
- Lighthouse JSON: `lighthouse.json`.
- Repository baseline evidence:
  `.factory/evidence/online-end-live.png` and
  `.factory/evidence/deterministic-run.md`.
