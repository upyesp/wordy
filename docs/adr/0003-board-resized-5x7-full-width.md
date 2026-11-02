# Board resized to 5×7, tiles fill the width

Phone feedback after the first deploy: at 6×9 the tiles were too small to read and slide comfortably, and the scoreboard sat high enough to hide under the iOS status bar on notched phones in the fullscreen PWA. The board drops one column and two rows — pointy-top, 7 rows of 5 tiles (35 tiles), odd rows still offset half a hex — and the tile circumradius grows from 32 to 39 so the drawn board spans ~372 of the 390pt stage width. The stage reserves a 56pt safe-area band at the top: the scoreboard, trace strip, and board all live below it, on every device, so layout stays deterministic instead of chasing `env(safe-area-inset-*)` per device.

## Considered options

- Keep 6×9 and shrink letterbox margins — tiles still too small; rejected
- 5×7 full-width tiles + fixed 56pt top safe band (chosen)
- Dynamic `env(safe-area-inset-top)` layout inside the canvas — per-device variance for no gain; rejected

Supersedes [ADR-0002](./0002-pointy-top-6-wide-offset-row-board.md), whose orientation and stagger reasoning carries over.
