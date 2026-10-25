# CIPHER

A green phosphor terminal HUD for the Galaxy Watch7 40 mm (432 × 432). It is resource-only WFF 4 / API 36, package `com.thedungeons2077.realtime.cipher` (`.dev` for debug builds). It is inspired by cyberdeck_terminal's matrix rain and uses REDLINE's rotating-ring idea, built to be light and smooth.

## Look

From the edge inwards:

| Layer | Motion (at Slow) |
|---|---|
| Minute bezel with a seconds block | seconds block sweeps once per minute |
| Comet sweep on the outer track | clockwise, 18°/s |
| Outer ring of matrix glyphs | clockwise, 3°/s |
| Segmented arc ring | counter-clockwise, 6°/s |
| Inner ring of dim glyphs | clockwise, 4°/s |
| 8 matrix-rain columns behind everything | falling, one pass every 8–12 s |
| Dark disc with battery, date, time and the Timer slot | fixed |

The glyphs are cyberdeck_terminal's matrix set (digits, `ZTHEMXAKR`, `:=*+<>`) in Share Tech Mono, with about a third mirrored. Ring brightness varies glyph by glyph, like the rain's heads and tails.

## Why it is light and smooth

- **One image per moving piece:** each ring, the sweep and each rain column is a single baked mask. A whole 70-glyph ring is one draw, rotated by one expression. The selected tree is 19–29 parts, including every complication type.
- **Live clock, every frame:** angles and positions read the millisecond clock. Motion starts the instant the face shows; there are no interpolations and no animation loops.
- **No sensors:** there is no tilt effect, so no accelerometer runs.
- **Memory:** the official evaluator gives 12.5 MB active (REDLINE is 30.0 MB) and 0.6 MB ambient. The APK is 480 KB.

## Settings

| Setting | Options (default first) |
|---|---|
| COLOURS | PHOSPHOR, AMBER, ICE, NEON, BLOOD, AZURE (cyberdeck_terminal's palettes) |
| CLOCK FONT | VT323, SHARE TECH MONO, DOT MATRIX, SEGMENT LCD |
| CLOCK SIZE | MEDIUM, SMALL, LARGE |
| CLOCK GLOW | HIGH, OFF, LOW |
| MOTION SPEED | SLOW, STILL, STANDARD, FAST |
| Effects (ON/OFF) | MATRIX RAIN, CODE RINGS, ARC RING, COMET SWEEP, SECONDS MARK |

- **Timer slot:** works as in REDLINE. Customize → the slot → Timer.
- **Ambient:** a dim, static clock in the chosen font and palette. At most 7.5% of pixels are lit.
- **Readout language:** the date covers English day and month names.

## Build and review

```bash
npm run compose
npm run check
bash scripts/release-wear.sh --face cipher --verify-only
```

The gallery is `out/previews/cipher/index.html`. It shows every palette, font, size and glow, each effect off, the Timer states, ambient per font, and a motion loop.
