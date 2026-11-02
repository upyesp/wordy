# wordy

A finger-slide word puzzle played on a honeycomb of tiles. The prototype phase proved the tactile feel — sliding and dipping — and the board now keeps score: traces of three or more tiles that form real words earn points.

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
_Avoid_: path

**Selected**:
The persistent marked (tinted) state a tile holds for the rest of a slide once it has joined the trace.
_Avoid_: visited, active, locked

**Trace strip**:
The display above the board echoing the trace's letters in visit order, recoloured once the word is judged.
_Avoid_: word bar, guess display

**Word**:
A trace of at least three tiles whose letters, read in visit order, form a dictionary word. Only words score.
_Avoid_: guess, entry

**Score**:
The player's accumulated points. A word of n tiles earns points that grow quadratically with n; each distinct word scores once per session.
_Avoid_: points (in prose), total

**Best**:
The highest Score reached in any session on this device; remembered between visits.
_Avoid_: high score, record
