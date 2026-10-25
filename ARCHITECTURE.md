# Architecture

## Layers

```
tools/compose/
  src/                  the generator engine (REDLINE and future faces)
    core/               expr.ts (numeric expression tree) · scene.ts (decorative nodes) · frame.ts (preview inputs) · geometry.ts
    wff/                xml.ts (builder, Condition) · nodes.ts (scene → WFF) · complication.ts (slot + preview)
    svg/                nodes.ts (scene → SVG previews)
    editor/             catalogue.ts (settings, selectXml) · icons.ts (96 px tiles) · letters.ts (5×7 alphabet)
    fonts/              outline.ts (pinned OFL TTFs) · glyphs.ts (cell layout, glow, masks)
    bake.ts             build-time layer cache
    build.ts            write or byte-check each face's res/ tree
  faces/redline/        design.ts · fonts.ts · editor.ts · render.ts (WFF) · preview.ts (SVG) · resources.ts · assets.ts
  halo/                 HALO's frozen generator (byte-identical; no new features)
  fonts/                committed OFL fonts with their licences
tools/check/            review gallery, release checker (verify_editor.py), packaged-pixel comparison
tools/measure/          watch-shell collector and host analysis
diagnostics/phone/      the phone helper app (Java): pair, install, test, report
faces/<face>/           resource-only Android modules; generated res/ is committed
```

One expression tree drives both outputs. `expression()` writes the WFF expression and `value()` evaluates it for previews and tests. Geometry starts at twelve and runs clockwise in both.

## A REDLINE watchface.xml

```
Scene
  interactive group (alpha 0 in ambient)
    ground
    palette ▸ decoration; each effect switch ▸ speed ▸ style
    clock_font ▸ glow ▸ clock_size ▸ DigitalClock (BitmapFont)
    clock_font ▸ battery + date (BitmapFont, or system font for REDLINE)
  ambient group (alpha 255 in ambient)
    clock_font ▸ dim DigitalClock
  ComplicationSlot (hidden in ambient)
```

- **Only Conditions select branches.** Declarations stay flat in UserConfigurations; nesting native selectors left the editors blank in 0.2.0.
- **Colours are literals.** A theme-colour lookup turned 0.1.0 white on the watch.
- **Readouts sit outside every moving group** and are declared once, not once per palette.
- **Fonts are bitmaps.** Each clock font has three families, `clock_<font>_off|low|high` (`_off` is also the ambient face). Fonts with a readout face add `readout_<font>`, whose lowercase letters reuse the capital masks.

## Fonts

`layoutFace` turns any InkSource (a TTF via opentype.js, or a vector design such as REDLINE's segments or DOT's 5×7 cells) into glyph cells:
- **Scale:** one reference ink height for all fonts.
- **Cell width:** the glyph's ink plus a pad that holds the baked glow.
- **Colon:** centred on the digits' vertical middle.
- **Fit:** the face shrinks to fit the widest `hh:mm`.
- **Output:** the cell widths become WFF `Character` widths, and the same masks drive the SVG previews.

Font files are verified against pinned SHA-256s before use.

## Layer cache

`LayerCache` flattens runs of at least eight static primitives into one cropped lossless WebP, keeping painter order. Moving groups keep their live transforms; only their artwork is cached. Names are content hashes, so identical neutral layers are shared across palettes.

## Checks

- **`npm run check`:** typecheck, vitest, byte-for-byte resource reproduction and the preview gallery. The gallery enforces under 10% ambient lit pixels for every font.
- **`tools/check/verify_editor.py`:** resolves Conditions for 1,022 editor states and asserts what the watch would draw. The states cover every option, every font × glow × size, every speed × style × effect combination, and a fixed-seed random sample. It also checks every BitmapFont character against its PNG size, and the Timer slot's types, bounds and empty default. With `--apk` it compares packaged resources through AAPT2's resource table, because AAPT2 renames ZIP paths.
- **`scripts/release-wear.sh`:** adds Google's WFF validator, lint, signature, no-code and no-permission checks, and the official memory evaluator.

## Phone helper

`diagnostics/phone` is a separate app with its own signing and version tags (`diagnostics-v*`). It pairs with the watch over Wireless debugging, installs inspected face APKs, and runs tests.
- **Smoothness test:** samples `dumpsys SurfaceFlinger --latency` on the watch-face surface for 20 s. It reports delivered fps, frame times, missed frames and renderer CPU.
- **Other tests:** the detailed 30 s Perfetto trace, battery interval and renderer logs.
- **No PC connection:** the PC never connects to the watch.

## Release tags

HALO uses `v*`; REDLINE uses `redline-v*`; the helper uses `diagnostics-v*`. Each has its own monotonic versionCode.
