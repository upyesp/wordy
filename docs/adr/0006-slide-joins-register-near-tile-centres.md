# Slide joins register near tile centres, not at the hex edge

Playtesting showed mis-touches: while sliding, a finger that only grazes a tile's edge or clips a corner still joined it to the trace, because hit-testing accepted any point inside the hex. Sliding joins now carry a centre-distance gate — a moving finger must come within 80% of the tile radius of a tile's centre before the tile joins the trace (`SLIDE_JOIN_FRACTION` in `Board.ts`). That leaves a dead margin around every tile that absorbs grazes and hand wobble, while any pass meaningfully over a tile still joins, so intentional slides are not made harder. Touch-down is exempt: a press is deliberate and keeps the whole hex as its target. The dip wave still follows the finger everywhere, so the board keeps responding visually inside the margin — only trace membership is gated. The constant is deliberately exposed so the feel can be retuned after more playtesting.

## Considered options

- Erode the hexagon uniformly (scaled-hex hit area) — deadens edges and corners equally; the corners, where three tiles meet, cause the worst mis-picks and benefit most from dying first; rejected
- Minimum dwell time before a tile joins — adds lag to fast, deliberate slides and fights the tactile feel; rejected
- Hysteresis (wider exit radius than entry radius) — prevents flicker, but re-joins are already impossible within a slide because the trace holds distinct tiles; rejected
- Require adjacency to the last trace tile — changes the game's rules about which traces are legal, not the input accuracy; rejected
- Centre-distance gate on sliding joins only, full hex on press (chosen)
