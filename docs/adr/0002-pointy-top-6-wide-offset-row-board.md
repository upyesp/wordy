# Pointy-top, 6-wide offset-row board

> **Superseded by [ADR-0003](./0003-board-resized-5x7-full-width.md)** — the board was
> resized to 5×7 with full-width tiles after phone feedback. The orientation and
> stagger reasoning below still stands.

The board is a rectangle of pointy-top hexagons: 9 rows of 6 tiles (54 tiles), odd rows offset by half a hex, giving zigzag left/right edges. The design brief specifies a 6×9 portrait board, which replaces the classic radius-based hexagonal board these games usually use. Orientation and stagger pervade layout, neighbour lookup, and hit-testing, so the choice is recorded: change either and you touch everything.

## Considered options

- Pointy-top, all rows 6, half-hex stagger (chosen)
- Pointy-top, alternating 6/5 rows, odd rows centred (51 tiles)
- Flat-top orientation
- Radius-2 hexagonal board (19 tiles)
