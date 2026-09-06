# Linebreak Clash handoff

## Independent verification 1 — FAIL

Independent verification on 6 September 2026 reviewed implementation candidate
`23e5b9ef0cee5d9d17f6faa9ade8e6facfb36032` and the matching live static
assets. Product code was not changed.

The game, sample, complete live 90-second two-client round, mid-round rejoin,
rematch, offline play, mobile performance, SQLite restart persistence, room
isolation, and live 429/`Retry-After` behavior passed. All 15 declared claim
commands passed individually, and `npm run check` passed 17/17 browser and 8/8
unit tests. Lighthouse remained 100 in all four categories.

The verdict is still **FAIL** because independent QA found three issues:

1. Major: public claims are missing from `.factory/claims.json`, and five
   promise components lack complete claim-test proof.
2. Minor: Escape does not pause an active round, although P and the Pause
   button work.
3. Minor: several phone navigation and text-link targets are under 44×44 px.

See [verification-1.md](./verification-1.md) for reproduction steps, claim
results, evidence, and earlier-finding dispositions. Fresh evidence is under
`/work/.evidence/linebreak-clash/`. The full report is also copied to
`/work/.evidence/qa-report.md`.

## Release

Linebreak Clash is a free browser arena for solo play, two players on one
keyboard, or two to four players in a private online room. Each round lasts 90
seconds. Players steer temporary trails, capture numbered relay nodes, and use
a dash to cross trails. The live product is
`https://linebreak-clash.sociobot.in`.

- Static implementation SHA: `5ff1528`.
- Realtime implementation SHA and deployed image: `19f41ed`
  (`sf-linebreak-clash-realtime:19f41ede5a77`).
- Claims and README SHA: `458a251`.
- Live verification artifacts SHA: `54d8881`.
- The final handoff commit is the repository HEAD containing this file.

## What shipped

- A deterministic fixed-step Canvas 2D arena with solo and local two-player
  modes, keyboard and touch input, remappable Player 1 keys, assist mode,
  persistent sound and motion settings, pause, refresh recovery, win/loss
  screens, and immediate restart.
- Private online rooms with random eight-character codes, two-to-four-player
  capacity, server-authoritative movement and collision, preset reactions,
  shared results, rematches, and a 20-second reconnect window.
- A product-owned `sf-linebreak-clash-realtime` service. It runs one replica,
  mounts `sf-linebreak-clash-realtime-data` at `/data`, and stores room state
  as a SQLite database. Inactive rooms expire after 24 hours.
- A one-click seeded sample at `/demo/`. It starts 4–2 with 56 seconds left,
  keeps a persistent sample label, resets deterministically, and never touches
  real game storage.
- Offline solo/local play, privacy and terms pages, a designed 404, route
  titles and metadata, security headers, sitemap, robots file, favicon, social
  image, skip link, focus states, reduced motion, and 200% text reflow.
- An original screen-printed transit-blueprint visual system. Every visual is
  hand-authored SVG or procedural Canvas geometry; no external image, font, or
  script is loaded.

## Verification

From a fresh clone of `19f41ed`, Node.js 22 and npm 10 were the only
prerequisites. `npm ci` reported zero vulnerabilities. Every command in
`.factory/claims.json` passed individually. The aggregate checks also passed:

```sh
npm ci
npm run build
npm run test:unit
npm run test:realtime
CI=1 npm test
```

Results:

- Build: `dist/` created; initial JavaScript 15.13 KB gzip and CSS 4.88 KB
  gzip.
- Unit: 8/8 passed.
- Realtime integration: four players accepted, fifth rejected, 20/20 transient
  reconnects succeeded, active SQLite room survived restart, 24-hour expiry
  passed, and rate limiting returned 429 with `Retry-After: 60`.
- Browser: 17/17 passed. This includes deterministic end state, restart reset,
  every play mode, settings, local refresh recovery, sample isolation, offline
  reload, mobile input/FPS, two independent online clients, online rejoin,
  invalid input, legal routes, focus, reduced motion, and axe integration.
- Fresh 320 px browser at 200% text: no horizontal overflow; the sample action
  remained visible.

Live verification on 5 September 2026:

- `/`, `/demo/`, `/online/`, `/privacy/`, and `/terms/` returned 200. An
  unknown route returned the expected designed 404.
- The factory URL check reported a 643 ms load, one `h1`, `lang="en"`, a main
  landmark, labelled buttons, and no console errors.
- Axe CLI reported zero violations on all five real routes and the 404.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.17 s, CLS 0, TBT 0 ms.
- Fresh phone: arena top 694 px in a 393×727 viewport, no horizontal overflow,
  and 60.0 measured FPS. Navigation text is 16 px.
- Fresh desktop sample: score 4–2, persistent sample label, deterministic reset,
  and unchanged real settings.
- Full live online run: two independent clients completed an actual 90-second
  round with the same result (`Lin wins.`); the guest rejoined during play and
  the rematch reset both scores.
- Live backend: `/health` returned 200; an active two-player room survived a
  complete revision stop/start; a room key was rejected in a different room;
  the live request limit returned 429 with `Retry-After: 60`.
- Final room-service state: revision `sf-linebreak-clash-realtime--0000004`,
  healthy, one replica, durable `/data` mount.

Evidence is in `.factory/evidence/`. The full live scripts are
`scripts/verify-live.mjs` and `scripts/verify-realtime-live.mjs`; the latter is
operator-only because it restarts the product revision and deliberately reaches
the rate limit.

## Deployment note

The first native Node SQLite startup exposed that this Azure Files mount does
not support its filesystem-locking mode. No player traffic reached those
revisions. The final service uses SQLite compiled to WebAssembly and atomically
serializes a standard SQLite file at `/data/linebreak-clash-v3.sqlite`. The
integration test reopens that file with Node's native SQLite driver, proving the
format and restart persistence. Two unused pre-live database files remain on
the same product volume; they contain no live room data.

The container deployment wrapper checks `/` and therefore keeps polling on the
service's deliberate 404 even after deployment. The wrapper was stopped only
after the revision was healthy and `/health` returned 200. The 404 is expected
for this API, not a failed route.

## Known gaps and next checks

- The researched 95% reconnect target is supported by 20/20 sandbox reconnects
  and one successful live mid-round rejoin. It is not yet a field reliability
  measurement.
- The target median of four rounds cannot be measured without collecting usage
  data. Rematches are implemented, but privacy defaults intentionally exclude
  behavioral analytics.
- Automated browser coverage uses Chromium. Manual release checks should also
  cover current Safari and Firefox before making cross-browser claims.
