# Clock fonts

Build inputs only. The watch receives baked PNG glyph masks, never these files. Each font is used under the SIL Open Font License 1.1 (licence file beside it). Each file is pinned by SHA-256 in `tools/compose/src/fonts/outline.ts`.

| Folder | File | Source |
|---|---|---|
| `dseg` | DSEG7Classic-Bold, DSEG14Classic-Bold | github.com/keshikan/DSEG release v0.46 |
| `rajdhani` | Rajdhani-SemiBold | github.com/google/fonts `ofl/rajdhani` |
| `oxanium` | Oxanium-SemiBold | github.com/sevmeyer/oxanium `fonts/ttf` (static instance) |
| `chakra-petch` | ChakraPetch-SemiBold | github.com/google/fonts `ofl/chakrapetch` |
| `share-tech-mono` | ShareTechMono-Regular | github.com/google/fonts `ofl/sharetechmono` |
| `vt323` | VT323-Regular | github.com/google/fonts `ofl/vt323` |

The REDLINE and DOT fonts are this project's own vector designs (`faces/redline/fonts.ts`).
