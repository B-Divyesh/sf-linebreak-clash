# Sample sandbox

## Entry points

- Live: `https://linebreak-clash.sociobot.in/demo/`
- Query alternative: `https://linebreak-clash.sociobot.in/?demo=1`
- Local: `http://localhost:5173/demo/`

The landing-page action **Try it with sample data** enters the sample in one
click. No account or setup is required.

## Sample state

Seed `620431` starts a solo round with Player 1 leading 4–2 after three relay
captures. Two realistic trail paths, three active relay nodes, and 56 seconds
remain. The visitor immediately controls Player 1 against the deterministic
bot.

The banner **Demo — sample data, nothing is saved** remains visible. **Reset
demo** recreates the same seed, score, paths, nodes, and timer. **Start for
real** discards the in-memory sample and returns to the normal game.

## Isolation

The sample state and sample settings live only in JavaScript memory. It creates
no localStorage, IndexedDB, or OPFS entry, and it does not read or write the
normal `linebreak-clash:*` localStorage keys. Reloading the sample recreates it
from the bundled seed.

The outcome-based `@claim:demo-isolation` browser test preloads a real setting,
enters the sample, changes a sample setting, resets, and proves the real value
and storage key list remain unchanged.

