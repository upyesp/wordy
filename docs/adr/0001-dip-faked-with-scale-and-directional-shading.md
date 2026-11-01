# Dip is faked with scale and directional shading

The tactile "dip" of a tile under the sliding finger is rendered in 2D: the tile scales down and its highlight/shadow shifts so the depression reads as off-centre, leaning toward wherever the finger is. We deliberately did not build mesh vertex displacement for the prototype: it is higher-risk shader work, while the shading fake can be built immediately and tuned against the smoothness bar. The tile renderer is structured so a mesh-displacement implementation can replace it later without touching input, trace, or board logic.

## Considered options

- (a) scale + darken only — reads as selection, not pressure; rejected
- (b) scale + directional shading — chosen
- (c) mesh vertex displacement (a true dent under the finger) — deferred; swap in if (b) reads flat
