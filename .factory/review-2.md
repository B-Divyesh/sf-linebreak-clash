# Review: Play a 90-second relay arena and rejoin

## Verdict

**FAIL — 1 minor finding and 0 untested public claims.**

The job is to play a 90-second trail arena, capture relay nodes, recover a
dropped player, and finish on a shared result screen. It is for solo players,
two people at one keyboard, or two to four friends on separate devices. Before
scrolling, fresh 1440×900 desktop and 393×727 phone browsers showed that job,
the audience, the playable arena, and **Try it with sample data** as the first
action.

## Candidate and scope

- Implementation reviewed: `8498e209db0f9f29641e883a3f3fd5acdac1f409`.
- Documentation baseline reviewed: `19ef1b5dab46fa94e04d7f3e004d4ded14cb97a4`.
- Live URL: <https://linebreak-clash.sociobot.in>.
- The live JavaScript and CSS matched the clean build byte-for-byte. The JS
  SHA-256 is `a399d8e72c156774c21ee063cc2855baa484185da9dd89e758ae5153eb5b6f28`.
  The CSS SHA-256 is
  `47624f40b8f8a787e16890ee2e2ffba2b5dd66b3eafcb6653c9323f8930a42ba`.
- Later commits through the documentation baseline contain verification and
  report changes. They do not require a different live product image.

## Finding

### F-01 — Minor — Populated online rooms overflow the phone viewport

At 393 CSS px, the online page fits before a room is populated. After a second
player joins, the two-column player list grows wider than its room panel. With
the default names, the document is 399 px wide in a 393 px viewport. The
343 px player list has 374 px of content, and the second player card reaches
398.78 px. Its right edge is clipped until the page is moved sideways.

The boundary case is worse. Both name inputs allow 20 characters. With
`Alexandra-Team-Alpha` and `Christopher-Player-2`, the document becomes 509 px
wide, or 116 px wider than the viewport. The player list has 484 px of content
inside a 343 px box. The second player's name, connection state, score, and
border extend off-screen.

Reproduce in a fresh Pixel 5 browser:

1. Open `/online/` and create a room.
2. Join it from a second browser with the default names or two 20-character
   names.
3. Inspect or scroll the 393 px page after both player cards appear.

The current `@claim:touch-controls` check visits the empty online page. It does
not measure the populated player list. The controls and game remain usable, so
this is minor, but the complete mobile room does not fit its viewport.

Evidence:
`/work/.evidence/linebreak-clash/review-2-phone-waiting-layout.png` and
`/work/.evidence/linebreak-clash/review-2-phone-long-name-overflow.png`.

## Clean checkout and declared claims

A clean clone at the documentation baseline used Node 22.23.2 and npm 10.9.8.
`npm ci` passed with zero vulnerabilities. `CI=1 npm run check` passed 10 unit
tests, the realtime integration, a production build, and 26 Chromium browser
tests. The build produced 15.28 kB gzip JavaScript and 4.94 kB gzip CSS.

The manifest has 30 unique IDs. Each ID has exactly one matching
`@claim:<id>` tag, with no missing, extra, or duplicate tags. Every declared
command was then run separately from the clean clone.

| Claim | Command | Result |
| --- | --- | --- |
| free-entry | `npm test -- --grep @claim:free-entry` | Pass |
| round-end | `npm test -- --grep @claim:round-end` | Pass |
| restart-reset | `npm test -- --grep @claim:restart-reset` | Pass |
| relay-score | `npm run test:unit -- --testNamePattern @claim:relay-score` | Pass |
| collision-score | `npm run test:unit -- --testNamePattern @claim:collision-score` | Pass |
| dash-break | `npm run test:unit -- --testNamePattern @claim:dash-break` | Pass |
| trail-expiry | `npm run test:unit -- --testNamePattern @claim:trail-expiry` | Pass |
| play-modes | `npm test -- --grep @claim:play-modes` | Pass |
| remapped-controls | `npm test -- --grep @claim:remapped-controls` | Pass |
| pause-controls | `npm test -- --grep @claim:pause-controls` | Pass |
| settings-persist | `npm test -- --grep @claim:settings-persist` | Pass |
| sound-feedback | `npm run test:unit -- --testNamePattern @claim:sound-feedback` | Pass |
| reduce-effects | `npm test -- --grep @claim:reduce-effects` | Pass |
| assist-mode | `npm run test:unit -- --testNamePattern @claim:assist-mode` | Pass |
| refresh-recovery | `npm test -- --grep @claim:refresh-recovery` | Pass |
| demo-isolation | `npm test -- --grep @claim:demo-isolation` | Pass |
| sample-state | `npm test -- --grep @claim:sample-state` | Pass |
| reaction-pings | `npm test -- --grep @claim:reaction-pings` | Pass |
| privacy-requests | `npm test -- --grep @claim:privacy-requests` | Pass |
| clear-saved-data | `npm test -- --grep @claim:clear-saved-data` | Pass |
| offline-play | `npm test -- --grep @claim:offline-play` | Pass |
| mobile-fps | `npm test -- --grep @claim:mobile-fps` | Pass |
| touch-controls | `npm test -- --grep @claim:touch-controls` | Pass |
| online-room | `npm test -- --grep @claim:online-room` | Pass |
| copy-invite | `npm test -- --grep @claim:copy-invite` | Pass |
| no-open-chat | `npm test -- --grep @claim:no-open-chat` | Pass |
| server-authority | `npm run test:realtime` | Pass |
| online-payloads | `npm test -- --grep @claim:online-payloads` | Pass |
| online-rejoin | `npm test -- --grep @claim:online-rejoin` | Pass |
| room-persistence | `npm run test:realtime` | Pass |

The public site, README, privacy page, sample guide, and settings copy were
cross-checked against the manifest. No public claim is missing or only partly
tested. Command output is in
`/work/.evidence/linebreak-clash/review-2-claim-commands.log`.

## Live game and sample

- The landing arena began at 305.73 px on desktop and 693.98 px in the 727 px
  phone viewport. Both first screens had no horizontal overflow.
- One click loaded the 4–2 sample with visible trails, three active relays,
  00:56 remaining, and the persistent **Demo — sample data, nothing is saved**
  label. Reset restored the sample. **Start for real** returned home. Preloaded
  real settings remained unchanged.
- A fresh phone run measured 60 FPS. Touch steering, offline reload, reduced
  motion, pause and recovery paths passed.
- A fresh desktop host and phone guest completed a real 90-second online room.
  The phone used touch steering, received a preset reaction, went offline for
  19.1 seconds, rejoined the active room, and received the same **Desktop
  wins.** end result. The result was announced and focused. A shared rematch
  reset both scores.
- The clean deterministic run reached an actual win/loss screen. **Play again**
  restored 01:30 and both scores to zero.

End-screen evidence:
`/work/.evidence/linebreak-clash/review-2-desktop-end-live.png`,
`/work/.evidence/linebreak-clash/review-2-phone-end-live.png`, and
`/work/.evidence/linebreak-clash/review-2-phone-desktop-run.json`.

## Backend, recovery, accessibility, and privacy

- The product-only room service returned health 200 after its current revision
  was restarted. An active room returned in `playing` state with two players.
  A credential from one room could not enter another room. The live allowance
  returned HTTP 429 with `Retry-After: 60`.
- Normal room entry, short-code validation, a missing-room error, the
  near-20-second rejoin boundary, an expired local snapshot, offline recovery,
  and reset paths passed. The overflow in F-01 is the only failed path.
- The factory URL verifier passed `/`, `/demo/`, `/online/`, `/privacy/`, and
  `/terms/`. Each had its correct title, `lang="en"`, one `h1`, one `main`, and
  no console error. All page links resolved.
- `/not-a-page` returned the expected styled HTTP 404 with a way back. This is
  expected behavior, not a defect.
- Fresh live Axe checks found zero violations on all five real routes and the
  404. Keyboard focus, native dialogs, live errors, 200% text reflow, visible
  controls, and route focus passed. Content and navigation focus contrast both
  measured 13.528:1. Visible links and controls measured at least 44×44 px.
- The live run recorded no console errors. Runtime requests went only to the
  static product and its product-owned room service. No analytics, advertising,
  CDN, or other third-party runtime request was observed.
- Fresh mobile Lighthouse scored 100 for Performance, Accessibility, Best
  Practices, and SEO. LCP was 1.175 seconds, CLS was 0, and TBT was 1 ms.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1: incomplete four-player, authority, near-limit rejoin, and sample proof | Fixed; all matching claim commands pass. |
| Verification 1: Escape did not pause | Fixed; button, P, and Escape preserve the same round. |
| Verification 1: links and controls under 44×44 px | Fixed; fresh live route measurements pass. F-01 is a separate populated-layout issue. |
| Verification 2: unlisted or incomplete public claims | Fixed; all 30 public claims are listed and pass separately. |
| Verification 2: 1.09:1 content focus outline | Fixed; fresh live content and navigation measurements are 13.528:1. |
| Verification 2: online result lacked announcement and focus | Fixed; the fresh phone and desktop end screen announced and focused the result. |

## Review limit

Chromium was used for automated and live verification. The product makes no
public claim of Safari or Firefox verification. This does not change the
finding or verdict.
