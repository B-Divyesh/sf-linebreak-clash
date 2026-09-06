# Linebreak Clash handoff

## Repair 2 — PASS

Implementation SHA: `8498e209db0f9f29641e883a3f3fd5acdac1f409`.
The separate documentation SHA is recorded in the follow-up handoff pointer
commit. Full evidence is in [verification-3.md](./verification-3.md).

This repair closes the three failures from independent verification 2:

1. `.factory/claims.json` now has 30 public claims. Every claim has exactly one
   outcome-based tagged test, and all 30 documented commands pass separately.
   The repaired coverage includes Copy invite, no open chat, temporary trails,
   dash gaps, sound feedback, reduced effects, assist mode, local/shared
   reactions, full demo storage isolation, and accurate online payloads.
2. Content focus now uses ink on paper while header/footer focus uses paper on
   navy. Fresh HTTPS content focus measures 13.53:1.
3. Async online results use polite atomic live regions and move focus to the
   result heading. A fresh live two-browser 90-second round proved the
   announcement, focus, dropped-client rejoin, and shared rematch.

The static app was built and deployed to `sf-linebreak-clash`; its cold live JS
and CSS hashes match local `dist/`. The realtime image did not change. Its
single-replica mode, Azure File `/data` mount, probes, and scale bounds were
preserved. A product-only live restart check confirmed health, isolated room
credentials, SQLite recovery, and 429/`Retry-After` behavior.

From a clean checkout, run:

```sh
npm ci
CI=1 npm run check
```

The final run passed 10 unit tests, realtime integration, production build, and
26 Chromium browser tests. All 30 manifest commands were then run separately
and passed. Build output is 15.28 KB gzip JavaScript and 4.94 KB gzip CSS.

Fresh desktop and 393×727 phone contexts showed the job, audience, sample
action, and live arena before scrolling. The sample stayed labelled, reset to
4–2, and did not change real settings. Live route and Axe checks passed for
all five product routes and the expected styled 404. No console errors occurred
on the sample, online, or legal flows.

The static product is free. No billing offer or external payment dependency is
advertised or required.

Known limits remain: field reconnect rate and median rounds are intentionally
unmeasured without analytics; automated coverage is Chromium only.

## Independent verification 2 — FAIL

Implementation candidate: `54b09c184e48dffdba3b2e03a4124be0f198edb5`.
Documentation baseline: `87d78ccc3eaa8110241d304bf358f6b9115b06d0`.
Verification 2 report SHA: `3cecff599127cfede39f474872d6e8a869e4033b`.

Fresh independent QA found 3 issues: one major claims-contract gap covering ten
untested or incompletely tested public promise components, a 1.09:1 content
focus outline, and an online end result that is neither focused nor announced
through a live region. The acceptance verdict is **FAIL** even though all 22
declared claim commands and all runtime gates pass.

The full evidence, reproduction details, claim table, and earlier-finding
dispositions are in [verification-2.md](./verification-2.md). No product code
was changed. The earlier repair record remains below for deployment context.

## Repair verification — PASS

Implementation SHA: `54b09c184e48dffdba3b2e03a4124be0f198edb5`.
Verification documentation SHA: `f5205abd224bc885ecbabb4a772d92b4c20fabfa`.

This repair resolves all three findings from independent verification 1:

1. The claim manifest now has 22 public claims. Each has exactly one tagged,
   outcome-based test. Coverage now includes four-player room completion,
   server authority against forged client state, a reconnect at 19.15 seconds,
   the complete sample state and reset, pause shortcuts, remapped keys,
   collision scoring, clearing every saved key, and mobile touch targets.
2. Escape now prevents the native dialog cancel default before opening the
   pause dialog. Escape, P, and the Pause button all pause and resume a live
   round without resetting it.
3. Header, banner, in-page, and footer links now have 44 by 44 px targets.
   Fresh phone checks cover the game, sample, online, privacy, and terms pages.

The repair also fixes the seeded sample run: supplied trails now start behind
each player, rather than under their spawn point, so the sample stays populated
and playable instead of immediately self-colliding.

The former public word “random” for room codes was removed from README copy.
The service continues to use cryptographic bytes; its integration run confirms
17 distinct valid room codes, but a browser outcome test cannot prove entropy.

## What was deployed

- Static app: built `dist/` deployed to `sf-linebreak-clash`. The cold live
  page references `main-s9MjsHDY.js`; its SHA-256 matches the local build.
- Realtime app: image
  `sociobotregistry.azurecr.io/sf-linebreak-clash-realtime:54b09c184e48`
  deployed to `sf-linebreak-clash-realtime--0000005`.
- The realtime deployment remains Single revision mode with min/max replicas
  both one, the existing `/data` mount, and
  `sf-linebreak-clash-realtime-data`. No storage, environment, probe, or scale
  configuration was changed.
- `.factory/catalog-description.txt` remains the plain verb-first 83-character
  description and was copied to `/work/.evidence/catalog-description.txt`.

## Verification from a clean checkout

Prerequisites: Node.js 22 and npm 10.

```sh
npm ci
CI=1 npm run check
```

`npm ci` completed with zero vulnerabilities. `CI=1 npm run check` passed:

- 8/8 deterministic unit tests;
- realtime integration: 17 valid distinct room codes, four accepted players,
  fifth-player 409, 20/20 reconnects, forged score/position/collision/clock
  rejection, SQLite restart persistence, 24-hour expiry, health, and 429 with
  `Retry-After: 60`;
- build: `dist/` created; JavaScript 15.16 KB gzip and CSS 4.91 KB gzip;
- 20/20 Chromium browser tests, including a full four-client 90-second room
  in the accelerated sandbox and a real-time 19.15-second dropped-client
  recovery.

Every one of the 22 commands declared in `.factory/claims.json` was also run
separately after `npm ci`; all passed. A manifest audit confirms exactly one
`@claim:<id>` outcome-test tag for each claim.

## Live verification

Fresh desktop and 393 by 727 touch contexts showed, before scrolling:

- Job: “Capture relay nodes with a moving trail”.
- Audience: friends playing on one screen or separate devices.
- First action: “Try it with sample data”.
- The live arena was visible in both contexts; phone had no horizontal
  overflow and no visible link or button smaller than 44 by 44 px.

`node scripts/verify-live.mjs` passed against HTTPS:

- sample score 4–2, persistent **Demo — sample data, nothing is saved** label,
  deterministic reset, and unchanged real settings;
- phone 59.5 FPS, offline solo reload, and reduced-motion behavior;
- a real two-client, 90-second online room with a dropped-client rejoin,
  shared **Lin wins.** end screen, and a zero-score rematch;
- no console errors and requests only to the static product origin and its
  product-owned realtime origin.

Fresh live route checks found 200 for `/`, `/demo/`, `/online/`, `/privacy/`,
and `/terms/`; `/not-a-page` returned the expected styled HTTP 404. Every
route had its expected title, `lang="en"`, one `h1`, and one `main` landmark.
Live Axe checks found zero serious or critical issues. The browser’s normal
console message for the deliberate 404 was classified as expected; there were
no unexpected console errors.

`node scripts/verify-realtime-live.mjs` passed after cycling only the existing
product revision: health 200, independent room isolation, active-room restart
persistence with two restored players, and live 429 with `Retry-After: 60`.

Evidence: `/work/.evidence/linebreak-clash/live-browser.json` and
`/work/.evidence/linebreak-clash/online-end-live.png`.

## Earlier findings disposition

| Earlier issue | Current disposition |
| --- | --- |
| Incomplete claims coverage | Fixed: manifest and outcome tests expanded; all commands pass. |
| Escape pause | Fixed and tested through an active round. |
| Small mobile links | Fixed and measured on every public route. |
| Offline/recovery, remapped keys, touch, P pause, reflow | Still passing. |
| SQLite startup, durable restart, rejoin after restart | Still passing locally and live. |
| Arena below the phone fold | Still visible at 393 by 727. |

## Known limits

- The researched 95% field reconnect target is supported by deterministic
  20/20 local reconnects, a near-boundary browser check, and a live rejoin. It
  is not yet a field reliability measurement.
- The target median of four rounds per group cannot be measured without
  behavioral analytics, which the product intentionally does not collect.
- Automated and live checks use Chromium. Current Safari and Firefox still
  need a manual release pass before making a cross-browser claim.
