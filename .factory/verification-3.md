# Verify claim coverage, focus, and online results

## Verdict

**PASS — all three independent-verification findings are fixed.**

Linebreak Clash is a 90-second relay arena for friends playing solo, on one
keyboard, or in a private two-to-four-player room. On a fresh desktop and a
fresh 393×727 phone context, before scrolling, the product showed:

- Job: “Capture relay nodes with a moving trail”.
- Audience: friends who want a quick browser arena on one screen or separate
  devices.
- First action: “Try it with sample data”, which opens a playable seeded round.
- The live arena, with no horizontal overflow on the phone.

## Candidate and deployment

- Implementation SHA: `8498e209db0f9f29641e883a3f3fd5acdac1f409`.
- Static product `sf-linebreak-clash` was deployed from its fresh `dist/`.
- Cold HTTPS assets match the local production build byte-for-byte:
  `main--ddsxgKd.js` SHA-256
  `a399d8e72c156774c21ee063cc2855baa484185da9dd89e758ae5153eb5b6f28`;
  `main-BdThT_9_.css` SHA-256
  `47624f40b8f8a787e16890ee2e2ffba2b5dd66b3eafcb6653c9323f8930a42ba`.
- The product-owned realtime service source was unchanged. It remains in
  Single revision mode with exactly one minimum and maximum replica and the
  existing `sf-linebreak-clash-realtime-data` durable mount.

## Repairs

### Public claims have complete outcome proof

The manifest now has 30 public claims, each with exactly one `@claim:<id>`
test. Eight new claim entries cover no open chat, Copy invite, temporary-trail
expiry, capture/collision sound, reduced effects, assist mode, preset reactions,
and documented online payloads. The dash claim now proves its visible trail gap,
and the sample-isolation claim now protects settings, a valid active round, an
online key, IndexedDB, and OPFS data.

The checks assert outcomes: actual clipboard data, actual visible reactions,
Web Audio oscillator output, paired game-state movement and collision results,
storage values, and observed WebSocket payload direction. They do not mirror
implementation strings.

### Focus is visible on every surface

Content focus uses `#10233d` ink against the paper surface. Header/footer focus
uses `#f3eddf` paper against navy. A fresh live primary action measured
**13.53:1**, exceeding the 3:1 focus-indicator requirement. Browser regression
checks cover both paper content and navy navigation.

### Online results announce and receive focus

Online status and result text are polite atomic live regions. When the server
ends a round, the visible result panel is announced and focus moves to its
“Round complete” heading for every player, including non-hosts. A fresh live
two-browser 90-second round ended with “Lin wins.” and proved the live region
and focused heading before a shared rematch.

## Clean verification

After `npm ci` with Node 22 and npm 10:

```sh
CI=1 npm run check
```

passed with 10 unit tests, realtime authority/persistence/rate-limit integration,
a production build, and 26 Chromium browser tests. `dist/` contains 15.28 KB
gzip JavaScript and 4.94 KB gzip CSS.

Every one of the 30 commands in `.factory/claims.json` was then run separately
from the same clean setup. All passed, including the separately declared
`server-authority` and `room-persistence` realtime commands. A manifest audit
found 30 entries, no missing tags, no extra tags, and one occurrence of every
claim tag.

## HTTPS checks

`node scripts/verify-live.mjs` passed against the cold HTTPS product:

- sample score 4–2, persistent “Demo — sample data, nothing is saved” label,
  exact reset, and unchanged real settings;
- phone rendering at 60.003 FPS, offline reload, and reduced motion;
- two independent real browsers completed the real 90-second room, rejoined a
  dropped browser, saw the same end result, and reset scores on rematch;
- no console errors and requests only to the static product and its
  product-owned room service.

`node scripts/verify-realtime-live.mjs` passed after cycling only the current
product revision: health 200, isolated room credentials, active-room persistence
through restart, and a live 429 with `Retry-After: 60`.

Fresh Playwright Axe checks against `/`, `/demo/`, `/online/`, `/privacy/`,
`/terms/`, and `/not-a-page` found zero serious or critical findings. Each real
route returned 200 with its expected title, `lang="en"`, one `main`, one `h1`,
and image alternatives. The styled `/not-a-page` response returned the expected
HTTP 404 and is not a defect. The repository has no `verify-url.sh`; the
installed Playwright Axe integration was used instead of the unavailable
standalone Chrome Axe CLI.

## Earlier finding disposition

| Earlier issue | Current disposition |
| --- | --- |
| Verification 1: four-player completion, server authority, near-limit rejoin, sample state | Still passing. |
| Verification 1: Escape pause and 44 px links | Still passing. |
| Verification 2: ten incomplete/unlisted claim components | Fixed with 30 manifest claims and separate outcome commands. |
| Verification 2: 1.09:1 focus outline | Fixed; live content focus is 13.53:1. |
| Verification 2: online end result not announced or focused | Fixed and verified in a real live round. |
| Offline, refresh, 200% text, mobile first screen, SQLite restart, 404 | Still passing. |

## Known limits

- The researched 95% field reconnect measure is not behavioral telemetry. The
  product intentionally does not collect that telemetry; deterministic,
  near-boundary, and live rejoin checks remain the available evidence.
- The researched median of four rounds per group is not measured because the
  product has no behavioral analytics.
- Automated browser coverage is Chromium. Safari and Firefox still need a
  manual release pass before making a cross-browser promise.
