# Ten words per board: the ration ends the game

The game had no end state: a board could be played forever, which left the daily ritual without a finish and made BEST incomparable between players — one grazes for two minutes, another grinds for twenty, on the same deal. Every board now grants a **ration of ten new words** (GLOSSARY: Ration). Invalid traces and repeats cost nothing; each newly scored word spends one. The ration is self-paced — no clock — and identical for everyone on the daily board, so a session finally has a fixed arc: deal, find ten words, results. Spending the last word completes the board: slides stop, a results card rises with the session score, best, and streak, and the daily points at tomorrow while a random board offers to deal again. The completion state is session-local; reloading deals a fresh ration.

## Considered options

- Fixed time limit — the classic Boggle end, but a clock fights everything the prototype proved: deliberation, hints, the meditative slide-and-dip feel; rejected
- Strike limit (invalid words end the board) — punishes exploration and the very grazes the input work (ADR-0006) made forgiving; rejected
- Slide ration (every finger contact spends one) — adds push-your-luck weight to the release, but a junk trace burning a slide is too harsh for casual play; rejected
- Cover the board (every tile joins a scored word) — the most poetic end state, but random deals can strand an unreachable tile and the endgame grinds for it; needs deal-time solvability guarantees; deferred as a possible master mode
- Score/word par that varies by deal — the target moves under the player and reads as a checklist, not an arc; rejected
- Ten-word ration, self-paced, invalids free (chosen)
