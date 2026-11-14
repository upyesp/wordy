# Render with WebGL, never WebGPU

The prototype asked Pixi for a WebGPU renderer (`preference: 'webgpu'`), and that single option breaks the game on iPhone. Chrome and Safari on iOS both run on WebKit, so one WebKit defect hits every iPhone browser at once, while a desktop browser (whose WebGPU path differs, or which has no WebGPU at all) boots the same bundle perfectly — which is why the bug survived local testing.

Two WebKit bugs cover the failure. Bug 301627, "WebGPU canvas flickers while rendering WebGPU game", describes the canvas becoming invisible for some frames; it sometimes settles, and reloading usually reproduces it. Bug 312563 goes further: a WebGPU app that changes its rendering resolution repeatedly never releases the Metal memory behind the recreated targets, and WebKit force-reloads the page to recover; the same app built for WebGL is unaffected no matter how many resolution changes are made.

Wordy triggered both. It requested WebGPU, and phone chrome — the collapsing URL bar, toolbars, the keyboard — fires resize events continuously, each one re-allocating the drawing buffer through `fit()`. On an affected iPhone the result was a rapid flicker between a blank page and the board: a forced-reload loop. The renderer is now explicitly WebGL, with WebGPU kept only as a last-resort fallback for a device where WebGL itself is unavailable. Nothing in this scene needs more: it is flat 2D polygons and text, far inside WebGL's budget, and the absence of a WebGPU code path is the whole point.

`fit()` also short-circuits when the effective resolution and letterbox are unchanged, so a resize storm no longer re-allocates the drawing buffer at all. That is belt and braces against the resolution-change leak, and it keeps the cheap path cheap on every device. The chosen backend is reported by `__wordyDebug()` so a future device report can be diagnosed from the phone itself.

## Considered options

- Keep WebGPU and accept the flicker — the game is unplayable on affected iPhones; rejected
- Keep WebGPU and only dedupe `fit()` — the flicker in bug 301627 is not resolution-driven, so it survives that fix; rejected
- Feature-detect iOS/WebKit and use WebGL only there — reaches the same outcome through a device-sniffing branch that must be maintained forever; rejected
- WebGL everywhere, WebGPU only as a fallback, plus a resize-storm guard in `fit()` (chosen)
