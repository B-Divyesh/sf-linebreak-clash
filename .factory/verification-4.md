# Verify populated mobile rooms and game paths

## Verdict

**PASS — 0 findings and 0 untested public claims.**

Linebreak Clash is a 90-second trail arena for solo players, two people sharing
a keyboard, or two to four friends on separate devices. A fresh 1440×900
desktop browser and fresh 393×727 touch browser showed the job, the audience,
the arena, and **Try it with sample data** before scrolling.

## Implementation and deployment

- Deployed runtime implementation: `528bba9e08c63aa507e34853f9ffc8f0c71e90f4`.
- Verification-harness source: `358df09809aa154470135868711666b019c3866c`.
  This changes only the sample-isolation test setup; it does not change the
  built browser assets.
- Live URL: <https://linebreak-clash.sociobot.in>.
- The fresh build at `358df09` produced `main-BsWgBQYr.js` SHA-256
  `81425e16bc7119476de0ef5700adfb44922f1a8ef853258fa60cd62181d16202` and
  `main-uqx63RgO.css` SHA-256
  `41fc7411f6f52baf70dae850309af4f8201a2994ae71a5f28bfa88cc8f18d624`.
  Cold HTTPS asset hashes matched both files.

## Current repair

Strict review 2's only finding is fixed at the roster layout itself:

- Phone rosters now become one column at 520 px and below.
- Each player-card grid permits its name column to shrink, and names wrap
  inside the card when necessary.
- The mobile regression creates an actual two-client room with the longest
  accepted names, `Alexandra-Team-Alpha` and `Christopher-Player-2`, then
  checks document width, roster content width, and both card edges.

A fresh live 393 px host and guest confirmed the repair. Both documents were
393 px wide; each 343 px roster had 343 px of content; both cards ran from
25 px to 368 px and showed name, connection state, and score.

The sample-isolation claim test was also made deterministic. It now pauses and
closes the real-round dialog before recording its stored fixture, so its
comparison proves that entering, changing, and resetting the sample cannot
alter saved data rather than comparing two moments of an advancing real round.

## Clean release checks

From a new checkout of `358df09`, with Node 22.23.2 and npm 10.9.8:

```sh
npm ci
CI=1 npm run check
```

Both commands passed. The check ran 10 unit tests, product-owned SQLite and
room-service integration, a production build, and 26 Chromium browser tests.
The build created `dist/` with 15.28 KB gzip JavaScript and 4.96 KB gzip CSS.

All 30 commands declared in `.factory/claims.json` then ran separately with
fail-fast handling and passed. This includes the seeded sample and reset,
offline local play, mobile FPS and touch controls, four independent online
clients, copied invites, reactions, no open chat, forged-state rejection,
near-20-second rejoin, and SQLite persistence/expiry.

## Live checks

- `verify-url.sh` passed on cold HTTPS: title, `lang`, one `h1`, one `main`,
  image alternatives, and no console errors.
- A first full live-frame-rate attempt overlapped the local claim runner and
  measured 36 FPS, so it was rejected as contaminated evidence. The isolated
  rerun measured **59.5 FPS** and passed all of its assertions.
- The isolated run used the one-click 4–2 sample. Its persistent **Demo —
  sample data, nothing is saved** label remained visible; Reset demo restored
  the sample; preloaded real settings were unchanged.
- Offline solo reload and reduced-motion behavior passed.
- Two independent clients played a real 90-second online room. One rejoined
  during the round. Both received **Lin wins.**, with a polite announcement
  and focus on **Round complete**. The host started a shared zero-score
  rematch.
- The product-only room service passed health after a restart, active-room
  SQLite recovery, room credential isolation, and HTTP 429 with
  `Retry-After: 60`.
- Runtime requests used only the static product origin and the product-owned
  room-service origin. No analytics, advertising, font CDN, or unrelated
  request was observed.
- Fresh Axe Playwright checks found zero serious or critical violations on
  `/`, `/demo/`, `/online/`, `/privacy/`, `/terms/`, and `/not-a-page`.
  Each real route returned 200 with its intended title; the styled missing
  route returned its intentional 404 and a route home. Every internal product
  link returned 200.

## Earlier finding disposition

| Finding | Current disposition |
| --- | --- |
| Verification 1 incomplete claims, Escape pause, and undersized touch targets | Fixed and covered by the 30 final claim commands. |
| Verification 2 claim coverage, focus contrast, and online result announcement/focus | Fixed and live-verified. |
| Review 2 F-01 populated mobile roster overflow | Fixed and regression-tested with two 20-character names in two 393 px clients. |

## Evidence and limits

- Cold URL check and populated-room capture:
  `/work/.evidence/linebreak-clash-repair-3.Xk6QnC/`.
- Full live run: `/work/.evidence/linebreak-clash/live-browser.json` and
  `/work/.evidence/linebreak-clash/online-end-live.png`.
- The catalog description was copied to `/work/.evidence/catalog-description.txt`.

Chromium is the automated and live browser used here. Safari and Firefox remain
manual release checks. The brief's field reconnect-rate and median-round goals
remain unmeasured because the product intentionally has no behavioral
analytics.
