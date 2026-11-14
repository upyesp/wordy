# Sounds obey the silent switch

wordy synthesizes its cues with Web Audio, which on iOS runs in the default (ambient) audio session: when the ring/silent switch is set to silent, the cues are inaudible even though `AudioContext.state` reports `running`. A page can opt out with `navigator.audioSession.type = 'playback'`, and WebKit bug 323022 reports that doing so also prevents a class of audio-session loss after interruptions, so the temptation is real and will recur.

We are not doing it. `playback` is an exclusive session: it pauses music or a podcast already playing on the device, and it overrides a physical mute the owner deliberately set. Short decorative blips do not justify either. A muted phone should make a silent game — that is the feature working, not a defect.

The consequence is a diagnostic rule rather than a fix. When a device reports no sound while everything else works, open `?diag=1` and read the audio line: `ctx running` means the page is producing audio and the silence lies downstream — the ring/silent switch, an output route, or WebKit's tab-wide audio-output failure (bug 323104), which survives reloads and clears only when Safari is quit. A `suspended`, `interrupted`, or `none` state is ours; `Sound.resume()` already resumes from every gesture, rebuilds a closed context, and drops one that keeps rejecting.

## Considered options

- `navigator.audioSession.type = 'playback'` — audible on silent devices and a mitigation for iOS session loss, but it pauses the user's music and overrides a deliberate physical mute; rejected
- `'transient'` — mixes and ducks instead of pausing, but still overrides the user's mute for decorative sound; rejected
- Play cues through an `<audio>` element, which ignores the silent switch on iOS — the same override plus an asset pipeline; rejected
- Keep the default session, treat silence on a muted phone as correct, and diagnose with `?diag=1` (chosen)
