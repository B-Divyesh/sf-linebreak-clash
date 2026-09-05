# Linebreak Clash

Linebreak Clash is a free 90-second browser arena for solo play, two players on
one keyboard, or two to four players in a private online room. Steer a temporary
trail through numbered relay nodes, then dash to cross trails without colliding.

It is for friends who want a quick arena with more to do than survive. Online
rooms use a product-owned authoritative service, need no account, and let a
dropped player rejoin for 20 seconds. Groups can restart together after a round.

## Play

- Player 1: A/D to steer, Space to dash.
- Player 2: Left/Right Arrow to steer, Enter to dash.
- Touch: use the labelled turn and dash controls below the arena.
- Pause: press P or Escape, or choose **Pause**.

Player 1 can switch to J/L for steering and I for dash in **Settings**.

Solo mode supplies a deterministic bot. Local mode gives each player separate
controls. Capturing a relay adds two points. A collision adds one point to the
other trail. The higher score wins when the 90-second timer ends.

For online play, one person creates a room at
[`/online/`](https://linebreak-clash.sociobot.in/online/) and shares its random
eight-character code or invite link. Two to four independent browsers can join.
The host starts the round and can start a rematch from the shared end screen.

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

In another terminal, start the room service:

```sh
mkdir -p /tmp/linebreak-clash-data
PORT=8787 LINEBREAK_DATA=/tmp/linebreak-clash-data/rooms.sqlite node realtime/server.mjs
```

Open `http://localhost:5173`. Node.js provides the SQLite driver, so no shared
database or separate database install is required.

## Verify every release claim

```sh
npm run test:unit
npm run test:realtime
npm run build
npm test
```

`npm run build` creates `dist/`. The Playwright suite starts the production
preview and a test room service itself. It exercises a complete deterministic
round, restart, every play mode, two independent online clients, online rejoin,
touch and keyboard input, settings, local refresh recovery, offline play, sample
isolation, routes, accessibility, privacy requests, and mobile frame rate.

`npm run test:realtime` also checks four-player capacity, a rejected fifth
player, 20 successful reconnects, SQLite restart persistence, room expiry,
health, and HTTP 429 responses with `Retry-After`.

The mobile browser profile renders at least 50 frames per second in the declared
test sandbox.

## Storage, offline play, and privacy

The full game stores settings and an active-round snapshot in browser local
storage. It stores an online room key when you join a room. A snapshot and a
dropped online connection remain eligible for recovery for 20 seconds. The
sample runs in memory and never reads or changes those keys. Solo and local
rounds work offline after the first visit through the product service worker.

Online play sends the chosen name, controls, and room state only to the
product-owned room service. SQLite room state survives a service restart and
expires after 24 hours without activity. There are no accounts, analytics, ads,
purchases, open chat, or third-party game services. See `/privacy/` and
`/terms/` for the public policies.

## Deploy

Deploy the contents of `dist/` as the `linebreak-clash` static site. Keep
`dist/staticwebapp.config.json` with the deployment so route errors, security
headers, content types, and immutable asset caching remain active. The factory
owns DNS and infrastructure changes.

Build `Dockerfile` as the product-owned `sf-linebreak-clash-realtime` service.
It listens on port 8080 and needs one replica with a durable `/data` mount. Do
not scale it across process-local replicas. Its health probe is `GET /health`.

## License

MIT. See [LICENSE](./LICENSE).
