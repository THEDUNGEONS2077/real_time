# real_time design

[FACE_STANDARD.md](FACE_STANDARD.md) defines REDLINE's architecture and design principles for every future face, including working customization in Galaxy Wearable and on the watch, readable fixed time, resumable motion and measurement-led efficiency. Each new face supplies its own visual style and layout.

# HALO design

REDLINE's separate reference, rotation profile, subtle glow and hardware/resource calibration are documented in [faces/redline/README.md](faces/redline/README.md). Shared renderer extensions preserve HALO's generated resources byte for byte.

## Reference and adaptation

Reference: the user's `wallhaven-ox3gqm.jpg`, a 1920×1080 navy sci-fi HUD. It is read locally from `/mnt/c/Users/57298327/Desktop/DL/` and is not copied into the repository or release.

The round watch preserves its concentric cyan/teal tracks, fine ticks, separated amber arcs, white side marks, diagonal ticks, square reticle and faint lower network. The landscape bokeh is reauthored procedurally for a round screen. The preview comparison aligns a 1080-pixel crop beginning at x=450 to the observed HUD centre, then measures ring-band and quadrant RGB averages. It is a tuning aid rather than an assertion of image equivalence.

The 432-unit canvas centres at (216,216). The outer radius is reduced to 204 so stroke extent and maximum simultaneous x/y tilt retain at least six units of foreground clearance. The reticle remains 150 units square. Dot glyphs have five columns, seven rows, eight-unit pitch and a 4.5-unit illuminated cell. Hours and minutes have separate rows with enough room for glow and padding.

| Information | Treatment |
|---|---|
| Time | Pale glowing dot-matrix, hours above minutes, watch 12/24-hour preference |
| Date | Uppercase abbreviated weekday and two-digit date, upper left |
| Steps | Today's WFF sensor count, upper right; sensor/provider presentation needs device comparison |
| Battery | 100-degree lower-left arc, BAT percentage, red-orange at ≤15% |
| Timer | Lower-right outlined provider slot; SET TIMER while empty, actual provider text/icon when configured |

The Timer slot has a larger interaction area than its text. Exact provider behaviour and the system empty-slot/editor flow remain watch acceptance items. There is no assumed TIMER launch target in WFF and no Alarm fallback.

## Colour and light

REFERENCE uses navy #050b12, cyan #6fd0e6, pale #cfeff7, teal #2c6f86 and amber #f4b942. PHOSPHOR and ICE keep those same semantic roles. White #ffffff and warning #ff5a2a stay fixed: WFF allows at most five colours per option.

Core digits and readouts are the brightest useful information. Unlit cells and the core grid are faint. Amber glow uses layered vector strokes instead of a full-screen glow bitmap. Glyph glow is baked into small masks. Decorative background details intentionally sit below text contrast; device readability takes priority over copying every landscape detail.

## Motion

- The seconds marker takes one minute around its own thin outer track. It never fills the amber segments into a solid ring.
- Outer and inner tracks turn in opposite directions over 120 and 300 seconds.
- Corner brackets breathe between 1.00 and 1.03 over two seconds.
- Nodes drift by two units over 20–36 seconds; three nodes blink in whole-second steps.
- A faint core scan descends over 0.6 seconds once every six seconds.
- Tilt moves the background and outer tracks by at most three units on each axis. Text and the shortcut remain still.

All effects default on and can be disabled separately. Decorative effects disabled together leave a still HUD while time, date and live data continue to update. No performance savings are claimed until measured on the watch.

## Ambient and preview limits

The user does not need AOD. The fallback contains only dim time on pure black: no date, rings, network, background, scan or tilt. Preview checks report both non-black pixel share and a mean-RGB light estimate over the circular screen, and require lit share below 10%.

The gallery includes every palette, low battery, still mode, both tilt extremes, midnight, large step counts and illustrative Timer content. Its six-second loop samples shared motion at 4 fps for inspection; that is not the watch's rendering frame rate. The actual complication icon/text, platform glyph scaling and power cost need device testing.
