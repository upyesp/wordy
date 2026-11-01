# wordy

A finger-slide word puzzle played on a honeycomb of tiles. This prototype phase exists to prove the tactile feel of the board — sliding and dipping — before any game rules exist. There is currently no word validation: a slide produces a **trace**, not a word.

## Language

**Board**:
The full honeycomb of tiles: 6 tiles wide, 9 tiles tall.
_Avoid_: grid, layout

**Tile**:
One hexagonal cell on the board, carrying a single letter.
_Avoid_: hex, cell, button

**Slide**:
One continuous finger contact with the board, from touch-down to lift.
_Avoid_: swipe, drag, stroke

**Press**:
The moment the finger touches down and a slide begins.
_Avoid_: tap (implies a discrete click)

**Release**:
The moment the finger lifts and the slide ends.
_Avoid_: drop, lift-off

**Dip**:
The localised depression of a tile while the finger is over it. The dip follows the finger's position across the tile, so the tile appears to tilt toward the finger.
_Avoid_: press-down, tilt, squash

**Trace**:
The ordered sequence of distinct tiles visited during one slide.
_Avoid_: path, word (word is reserved for when game rules arrive)

**Selected**:
The persistent marked (tinted) state a tile holds for the rest of a slide once it has joined the trace.
_Avoid_: visited, active, locked

**Trace strip**:
The display above the board echoing the trace's letters in visit order.
_Avoid_: word bar, guess display
