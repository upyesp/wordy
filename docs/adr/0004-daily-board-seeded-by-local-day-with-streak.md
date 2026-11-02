# Daily board is seeded by the local calendar day, with a streak

Every visit opens on a *daily board*: the generator runs with a mulberry32 PRNG seeded from the player's local day index, so the same day always deals the same arrangement (and, because the generator and word lists are deterministic, every player gets that arrangement too). "New game" deals random boards; "Daily board" in the menu re-deals today's. The streak counts consecutive local days on which at least one word was **scored** — opening the app is not enough — and it is stored device-local beside BEST (ADR: preferences already live in localStorage).

## Considered options

- Random board every visit, no daily — no shared puzzle and no reason to return tomorrow; rejected
- UTC day boundary — a board that changes mid-evening for some players; local midnight matches "today" to the player; chosen
- Streak on app open — inflates the streak without play; first scored word is the honest signal; chosen
- Server-issued daily puzzle — needs a backend and accounts the prototype does not have; rejected
- Local day seed as chosen. A change to the generator or word lists reshuffles that day's board, which is acceptable for a device-local streak.

The daily streak caption sits in the gap under the score ("DAILY · STREAK 3", or "STREAK 3" on a random board). A missed day shows no streak until the next word is scored, which resets it to 1.
