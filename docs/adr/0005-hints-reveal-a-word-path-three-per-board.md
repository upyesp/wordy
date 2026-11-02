# Hints reveal a full word path, three per board

A word search can stall on a board where the player cannot spot a word. The menu offers **three hints per board**: a hint finds the longest dictionary word on the board that has not been scored, flashes its tiles in reading order, and echoes the word in the trace strip in dim ember. The hint never scores the word or marks it found — the player still has to trace it. The count sits in the menu row, which disables at zero and resets with every new or daily board.

## Considered options

- Reveal one letter — does not help find the route, which is the hard part; rejected
- Unlimited hints — turns the board into a typing exercise; rejected
- Points penalty per hint — punishes exactly the player who is stuck and complicates scoring; rejected
- Auto-score the revealed word — removes the play; rejected
- Three path reveals per board (chosen)

The trace strip doubles as the hint display: it keeps the hint word visible while the player starts a slide, and swaps to the live trace on the first tile that joins. Hints are per-session and device-local, like the score.
