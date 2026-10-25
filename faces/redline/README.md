# REDLINE

A black-and-red concentric HUD for the Galaxy Watch7 40 mm (432 × 432). It is resource-only WFF 4 / API 36, package `com.thedungeons2077.realtime.redline` (`.dev` for debug builds). Version 1.0 rebuilds the face on the cleaned-up generator. It adds clock fonts, glow and size choices, plus a Timer complication.

## Layout

Everything readable sits inside the 145-unit inner opening and never moves:

| Element | Position | Notes |
|---|---|---|
| Battery % | top, y 80–104 | Turns amber at 15% or less |
| Date | y 118–148 | `SUN 25 OCT`, in the clock font's readout face |
| Time | centred on (216,216) | `hh:mm`, follows the watch's 12/24-hour setting |
| Timer slot | bottom, 120 × 52 at (156,290) | Tappable complication; shows `SET TIMER` until set |

The rings, mesh, reticle and slot brackets are decoration. The two rotors turn and tilt around the fixed readouts.

## Settings

| Setting | Options (default first) |
|---|---|
| COLOURS | REFERENCE RED, AMBER, CYAN, GREEN, VIOLET, ICE |
| CLOCK FONT | REDLINE angular, SEGMENT LCD (DSEG7), RAJDHANI, OXANIUM, CHAKRA PETCH, SHARE TECH MONO, VT323 terminal, DOT matrix |
| CLOCK SIZE | MEDIUM (0.3.x size), SMALL (85%), LARGE (110%) |
| CLOCK GLOW | LOW, OFF, HIGH |
| MOTION SPEED | SLOW 0.5×, STILL, STANDARD 1×, FAST 2× |
| ROTATION STYLE | SMOOTH, DYNAMIC |
| Six effects | Seconds beacon, outer rotor, inner counter-rotor, accent pulse, radar sweep, wrist depth (each ON/OFF) |

The defaults reproduce 0.3.2, so an update keeps today's look until a new option is picked. Existing saved choices are kept.

**Fonts.** Every font is baked at build time into PNG glyph masks with the chosen glow. The watch never loads a TTF, so there is no font fallback, and previews show exactly the shipped glyphs.
- All fonts share one digit height and fit the 308-unit width of 0.3.2's clock, so changing font never moves the layout.
- Proportional fonts use tight per-character widths, so `11:11` stays centred.
- SEGMENT keeps fixed LCD cells, with faint unlit "8" segments behind each digit.
- The date and battery use a small face of the same family; REDLINE keeps its system-font readouts.
- Bitmap readouts cover English day and month abbreviations. Another watch language would show gaps.

**Timer slot.** It accepts short text (an icon above text), ranged values (text over a progress bar), and monochrome or small images. To set it: Customize → the slot → choose Timer. No provider is guessed, so the slot starts empty.

## Motion

The 0.3.x motion the user accepted as "very smooth" is unchanged:
- **SMOOTH:** each ring moves for one second, linearly, toward a target the clock refreshes every second. It requests 60 fps and uses no infinite loops.
- **DYNAMIC:** reads the millisecond clock with a slow speed wobble.
- **Speeds at Slow:** the outer rotor turns at 10°/s; both inner red bands turn once per 120 s.
- **STILL and disabled effects:** these select static subtrees, so no hidden clock or sensor expression keeps running.
- **Ambient:** a dim, static clock in the chosen font at a compact size. At 08:08 at most 7.5% of the screen lights up across all fonts.

## Resource figures (local, not device measurements)

- **Memory:** the official evaluator gives 30.0 MB active and 1.3 MB ambient (limits 100 / 10 MB). Eight fonts × three glows add glyph masks, compared with 0.3.2's 22.4 / 0.16 MB.
- **Draw parts:** a selected tree draws 19–23 parts, counting every complication type.
- **Checker coverage:** 1,022 editor states and 38 option icons.

Delivered smoothness is measured on the watch with the helper's SMOOTHNESS TEST.

## Build and check

```bash
npm run compose        # regenerate resources
npm run check          # types, tests, byte-for-byte reproduction, gallery
bash scripts/release-wear.sh --face redline --verify-only
```

The review gallery is `out/previews/redline/index.html`. It has every font, size, glow and palette, the Timer states, ambient per font and a motion loop.

## Watch acceptance

1. Install with the helper (step 2), then add REDLINE.
2. In Galaxy Wearable and on the watch, try each CLOCK FONT, SIZE and GLOW; Save; reopen to confirm they persist.
3. Set the Timer slot to Timer. Start a timer and check the countdown shows and tapping opens the Timer app.
4. Switch to another face and back. Motion must resume, including after screen timeout.
5. Run SMOOTHNESS TEST three times on 1.0 at Slow + Smooth, and three times on 0.3.2 if it is still installed elsewhere, then paste the reports.
