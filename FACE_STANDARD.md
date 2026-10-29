# real_time face standard

REDLINE establishes the shared architecture and design language for every new face. Each face has its own style, palette, silhouette and information layout. The common principles are clear time, dense but readable instruments, purposeful motion, restrained light, working phone/watch customization and measured resource cost. Existing HALO remains an independent design.

## Visual and interaction principles

- Make the time the clearest fixed element. Respect the watch's 12/24-hour setting. Size and place every other instrument around it; never let motion, readouts or a complication obscure it. Centre visible ink on both axes, including narrow times such as 11:11: use tight per-character cell widths (`layoutFace`), not fixed cells or added tracking. A deliberately fixed-cell font (an LCD) must say so.
- Use a dark background, hierarchical accent colours, fine mechanical detail and intentional negative space. New styles may reinterpret this HUD language rather than copy REDLINE's exact rings, red palette or instrument positions.
- Use counter-motion and bounded depth to communicate mechanical structure. Keep time, live readouts and touch targets stationary. Seconds keep real time at every decorative speed.
- Keep glow narrow and subtle. Bake blur at build time; do not add runtime bloom, full-screen filters or image sequences as decoration.
- Supply useful colour choices, Still/Slow/Standard/Fast motion choices, and independent effect controls where applicable. Still removes decorative clock/sensor dependencies and overlays; it does not freeze time or live data.
- Offer clock font choices by baking pinned OFL fonts into BitmapFont glyph masks at build time (`tools/compose/src/fonts`). Never ship a TTF or rely on a runtime font fallback. Glow is baked per level; all fonts share one ink height and the face's clock width.
- Keep a static, dim time-only ambient fallback on black. Normal use and battery baselines assume AOD off.
- Use an actual editable complication for shortcuts. Display setup instructions while empty and actual selected-provider content after setup. Never label Alarm as Timer or guess an untested Samsung component.

## Configuration architecture

`tools/compose/src/editor/catalogue.ts` is the shared catalogue, metadata and selection builder; `editor/icons.ts` draws the option tiles. A face supplies its own settings, option labels, defaults, captions and accent colours. Options may carry their own tile artwork (REDLINE's font tiles show "12" in each font). Both platform editors consume the same APK metadata.

- Keep configuration declarations flat under `UserConfigurations`.
- Use `Condition` expressions to compose selections in the scene. Do not nest native `ListConfiguration`/`BooleanConfiguration` scene selectors through groups or other options. [Android documents this restriction](https://developer.android.com/training/wearables/wff/personalization/user-configurations); passing XSD validation alone does not catch it.
- Provide real packaged icons, display-name resources and screen-reader resources for every setting and list option. Icons are 96×96 PNGs with compact captions so options remain identifiable in icon-only companion layouts. Check their visible pixels, dimensions and size.
- Use explicit ON/OFF list tiles for binary effects, with stable `TRUE`/`FALSE` values. This makes every choice visible without depending on companion-generated Boolean artwork. Keep IDs stable across releases; a change from a Boolean to a list setting may restore that effect to its declared default once.
- Preserve REDLINE's literal-colour rendering unless a replacement is verified on the actual watch. Palette selections choose cached coloured layers and literal paint, with a default fallback; they do not resolve theme-colour indices.
- Keep editor icons out of the rendered scene. Editing metadata must not add per-frame work.
- Keep complication editing independent of palette, speed and effect selections.

## Rendering and resource architecture

Each face is a separate resource-only WFF 4/API 36 module with a `.dev` debug package. No executable code, permissions, networking or analytics belong in the face. Installation lives in the separate local phone installer; diagnostics are no longer part of its UI.

The TypeScript scene, geometry, glyph metrics, palette and motion calculations remain authoritative for WFF and SVG. Commit generated Android resources. Test regeneration byte for byte and reject stale files. Preserve unchanged existing faces' resources when extending shared tools.

`tools/compose/src/bake.ts` caches sufficiently large static runs into cropped lossless layers without changing painter order. Cache moving carriers' artwork while keeping their live transform. Resource names are content hashes, so identical neutral layers are shared across palettes. Keep vector source and live time/readouts; never flatten the face into a time-dependent bitmap sequence. Check cached artwork against source vectors at motion and tilt extremes.

Drive continuously moving decoration from platform clock sources, read live every frame (`[SECONDS_IN_DAY]+[MILLISECOND]/1000`), so motion starts the instant the face appears after unlock or a swipe. One-second interpolation toward whole-second targets (REDLINE's GLIDE) looked smooth but paused for up to a second after wake, so it is an option, not the default. Never rely on an infinite constant-target animation loop: REDLINE 0.2.0's stopped after a face switch. Test leave/re-enter, unlock and swipe-back, editor cancel/save and restart before accepting a motion lifecycle. Never infer a guaranteed frame rate from an SVG animation or XML request.

Use a 432-unit canvas for the Watch7 40 mm. Include stroke, baked glow, rotated images' visible pixels and maximum simultaneous tilt when checking the circular six-unit foreground margin. Transparent bitmap corners are not illuminated content. Evaluate the signed APK against the official 100 MiB active/10 MiB ambient budgets. Record memory increases as well as decreases: caching trades decoded image memory for fewer separately drawn primitives.

## Verification and acceptance

Local verification must cover glyphs/time formatting, rollover, steps, battery warnings, motion bounds, all settings and static ambient behaviour. Inspect the **packaged** resource table: AAPT2 may rename ZIP paths. Verify every editor label/icon, image and glyph survives packaging and matches the generated source. Run WFF, memory, signature, no-code and no-permission checks.

`tools/check/verify_editor.py` holds one acceptance profile per face (REDLINE, CIPHER, NEXUS). For REDLINE it resolves Conditions for 1,279 editor states: every option, every font × glow × size, every speed × style × effect combination, and a fixed-seed random sample. It also checks every BitmapFont character against its PNG size, and the complication slot. Full products no longer scale once fonts are added, so cover each axis fully and their interactions by sampling. A new face adds its own profile and tests rather than inheriting REDLINE's coordinates.

Device acceptance is a separate gate. A build cannot be called fully functional merely because these local checks pass. On the user's actual Galaxy Wearable/Watch7 combination:

1. Open Customize in Galaxy Wearable. Check every category, each visible option icon/caption and selected state. Choose and Save each colour, speed, style and individual effect; verify the preview and applied face change.
2. Close/reopen Customize and confirm saved values persist. Cancel a different choice and verify the previous selection survives.
3. Repeat in the on-watch editor. Verify phone-to-watch and watch-to-phone changes agree after re-opening their editors.
4. Switch to HALO/another face and back repeatedly. Motion must resume. Test Still, restore motion, allow timeout/wake, and reopen the editor. Recheck after a watch restart.
5. If a face includes a shortcut, select Timer once in the complication editor if available; verify displayed provider content and launch target on the watch. Record an unavailable provider as unresolved, never substitute Alarm silently.
6. Verify the live fields the face exposes, time readability and the minimal ambient fallback. REDLINE omits steps; its editable Timer slot returned in 1.0.0.

Record exact face and installer versions, watch firmware, choices and results. For a failure, record the exact reproduction. Do not clear app data, remove pairing or reset the watch as a routine workaround.

Track total parsed scene size as well as the selected drawing count. NEXUS's on-watch controls worked while Galaxy Wearable timed out opening Customize after 0.1.1 delivery. Inactive palette × font × glow × size copies can multiply the definition the companion must load. Share independent text where supported, retain stable setting IDs/icons and compare resolved drawing instructions before changing an accepted face. The 0.1.2 configuration-only RGB/tint approach is a candidate, not a proven Samsung fix; require phone open/Save/reopen and on-watch colour checks before adopting it in another face.

## Efficiency and optimization

Every new face reads `OPTIMIZATION.md`. The user judges smoothness and performance on the watch; compare one change at a time under the same settings, and record their observations there.

Treat selected WFF part count, XML size, APK size and official memory estimates as engineering metrics. They do not establish delivered FPS, CPU time, jank or battery savings. Report unavailable metrics honestly and keep whole-watch power distinct from shared renderer activity. Choose further changes from measured results; there is no fixed battery cutoff. Keep raw captures private and commit only reviewed summaries with build/device, visual tradeoff, result and confidence.
