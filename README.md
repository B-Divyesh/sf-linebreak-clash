# Linebreak Clash

Linebreak Clash is a free 90-second browser arena for one player against a bot
or two players on one keyboard. Steer a temporary trail through numbered relay
nodes, then use a dash to cross trails without colliding.

It is for friends who want a quick shared-screen game with more to do than
survive. A round lasts 90 seconds. Groups can restart immediately for another
round.

This static first release does not connect separate devices. The researched
online room and server-authoritative rejoin mode remains a future dependency on
a product-owned realtime service; no offline demo is labelled as multiplayer.

## Play

- Player 1: A/D to steer, Space to dash.
- Player 2: Left/Right Arrow to steer, Enter to dash.
- Touch: use the labelled turn and dash controls below the arena.
- Pause: press P or Escape, or choose **Pause**.

Player 1 can switch to J/L for steering and I for dash in **Settings**.

Solo mode supplies a deterministic bot. Local mode gives each player separate
controls. Capturing a relay adds two points. A collision adds one point to the
other trail. The higher score wins when the 90-second timer ends.

Try the isolated sample at
[`/demo/`](https://linebreak-clash.sociobot.in/demo/), or use
[`?demo=1`](https://linebreak-clash.sociobot.in/?demo=1). It starts from seed
620431 with three captures, visible trails, and 56 seconds left.

## Run from a clean checkout

Prerequisites: Node.js 22 and npm 10.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Verify every release claim

```sh
npm run test:unit
npm run build
npm test
```

`npm run build` creates `dist/`. The Playwright suite starts the production
preview itself. It exercises a complete deterministic round, restart, both
modes, touch and keyboard input, settings, refresh recovery, offline play,
sample isolation, route titles, legal pages, missing-page design, accessibility,
privacy requests, and the mobile frame-rate measurement.

The mobile browser profile renders at least 50 frames per second in the declared
test sandbox. The simulation advances at a fixed 60 Hz. Initial production
JavaScript is about 12 KB compressed.

## Storage, offline play, and privacy

The full game stores settings and an active-round snapshot in browser local
storage. A snapshot remains eligible for refresh recovery for 20 seconds. The
sample runs in memory and never reads or changes those keys. Solo and local
rounds work offline after the first visit through the product service worker.

There are no accounts, analytics, ads, purchases, or third-party runtime
requests. See `/privacy/` and `/terms/` for the public policies.

## Deploy

Deploy the contents of `dist/` as a static site. Keep
`dist/staticwebapp.config.json` with the deployment so route errors, security
headers, content types, and immutable asset caching remain active. The factory
owns DNS and infrastructure changes.

## License

MIT. See [LICENSE](./LICENSE).
