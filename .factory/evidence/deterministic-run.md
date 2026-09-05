# Deterministic run evidence

The `@claim:round-end` Playwright test starts solo mode at `01:30`, advances the
fixed 60 Hz simulation at 18× wall-clock speed, and waits for the same end path
used by normal play. Seeded bot behavior produces an actual loss for Player 1.
The end screen reports a winner and final score, and moves focus to **Play
again**. The test then records `round-end.png` in this directory.

The `@claim:restart-reset` test begins from another completed round, selects
**Play again**, and observes an active arena at `01:30` with both scores reset to
zero.
