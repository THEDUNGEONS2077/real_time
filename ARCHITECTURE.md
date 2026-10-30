# Architecture

## Layers

```
tools/compose/
  src/                  the generator engine (REDLINE and future faces)
    core/               expr.ts (numeric expression tree) · scene.ts (decorative nodes) · frame.ts (preview inputs) · geometry.ts
    wff/                xml.ts (builder, Condition) · nodes.ts (scene → WFF) · complication.ts (slot + preview)
    svg/                nodes.ts (scene → SVG previews)
    editor/             catalogue.ts (settings, selectXml) · icons.ts (96 px tiles) · letters.ts (5×7 alphabet)
    fonts/              outline.ts (pinned OFL TTFs) · glyphs.ts (cell layout, glow, masks) · catalog.ts (shared clock fonts) · wff.ts / svg.ts (BitmapFont output)
    bake.ts             build-time layer cache
    raster.ts           opt-in alpha cropping, static-image merging and direct image transforms
    build.ts            write or byte-check each face's res/ tree
  faces/redline/        design.ts · fonts.ts · editor.ts · render.ts (WFF) · preview.ts (SVG) · resources.ts · assets.ts
  faces/cipher/         design.ts · assets.ts / masks.ts (baked ring, rain and sweep masks) · editor.ts · render.ts · preview.ts · resources.ts
  faces/nexus/          design.ts · masks.ts · artwork.ts (packed scenes) · editor.ts · render.ts · preview.ts · resources.ts
  faces/jarvis/         independent circular-instrument design using the accepted NEXUS packing/editor approach
  faces/reactor/        independent armoured energy-instrument design using the same accepted architecture
  halo/                 HALO's frozen generator (byte-identical; no new features)
  fonts/                committed OFL fonts with their licences
tools/check/            review gallery, release checker (verify_editor.py), packaged-pixel comparison
tools/measure/          historical watch-shell collector and host analysis (unused by the install-only phone app)
diagnostics/phone/      the phone installer app (Java): pair, install
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
- **Colours use explicit palette constants.** A theme-colour lookup turned 0.1.0 white on the watch. Existing faces use literal attributes; NEXUS 0.1.2's accepted configuration-only RGB approach is described below.
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

NEXUS 0.1.1 opts into `RasterOptimizer`. Its original scene remains authoritative; `artwork.ts` compiles cropped masks and consecutive static image runs once for both WFF and SVG. A single-image moving group can become a `Sprite` (a WFF `PartImage` with direct transforms), provided its pivot is valid inside the crop. Per-instance preview tints use `resource:literal-colour` keys so shared masks can have different colours. Existing faces keep their old output paths and byte-identical resources.

`node tools/check/nexus-optimization.ts` compares 384 matching raster frames and writes structural counts and pixel error to `out/optimization/nexus/comparison.json`. It does not connect to the watch or report device FPS.

NEXUS 0.1.2 shares its interactive clock/readouts across palettes to reduce companion-editor loading work. Decoration and ambient retain literal colours. A stationary clock group uses the WFF 4 `tintColor` transform with explicit `colorRgb(r,g,b)` constants selected by the existing palette ID. Readout BitmapFonts use the same configuration-only colour selection directly. There are no indexed theme-colour references or per-frame colour sources. The inline BitmapFont inside TimeText does **not** accept Transform in the pinned schema, so its white glyphs inherit the parent's tint. Clock boxes, sizes, masks and motion trees remain unchanged. The user accepted the phone editor repair on 2026-10-29. This is the rendering/editor baseline for future faces; see [the checkpoint](docs/CHECKPOINT-NEXUS-0.1.2.md). Each new design still requires its own phone/watch acceptance.

`python3 -I tools/check/nexus-editor.py` compares 3,776 interactive states and all 48 palette/font ambient states against drawing-instruction hashes recorded from released 0.1.1. It checks resolved colours, text geometry, motion, painter order, the entire editor catalogue and unknown-palette fallback. The fixture is independent of the current generator. These are instruction-equivalence checks, not renderer screenshots or measured editor latency.

- **`npm run check`:** typecheck, vitest, byte-for-byte resource reproduction and the preview gallery. The gallery enforces under 10% ambient lit pixels for every font.
- **`tools/check/verify_editor.py`:** picks a profile by face name (REDLINE, CIPHER, NEXUS); a new face adds its own. For REDLINE it resolves Conditions for 1,279 editor states and asserts what the watch would draw. The states cover every option, every font × glow × size, every speed × style × effect combination, and a fixed-seed random sample. It also checks every BitmapFont character against its PNG size, and the Timer slot's types, bounds and empty default. With `--apk` it compares packaged resources through AAPT2's resource table, because AAPT2 renames ZIP paths.
- **`scripts/release-wear.sh`:** adds Google's WFF validator, lint, signature, no-code and no-permission checks, and the official memory evaluator.

## Phone installer

`diagnostics/phone` is a separate app with its own signing and version tags (`diagnostics-v*`). Its package name is kept so updates preserve pairing.
- **What it does:** pairs with the watch over Wireless debugging, checks a chosen face APK (known package, release certificate, no code or permissions), and streams it to the watch's package manager with a progress bar. It then verifies the installed version.
- **Opening APKs:** an APK can be picked in the app or opened into it via "Open with".
- **No diagnostics:** smoothness and performance are reported by the user. `tools/measure` remains only as an unused record of the earlier collector.
- **No PC connection:** the PC never connects to the watch.

## Release tags

HALO uses `v*`; REDLINE uses `redline-v*`; CIPHER uses `cipher-v*`; NEXUS uses `nexus-v*`; JARVIS uses `jarvis-v*`; REACTOR uses `reactor-v*`; the installer uses `diagnostics-v*`. Each has its own monotonic versionCode.
