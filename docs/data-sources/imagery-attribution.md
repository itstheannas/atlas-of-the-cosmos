# Imagery and project-asset attribution

## Bundled assets

| Asset                | Purpose                                               | Origin                                                                                                                                                                                         | Licence / rights note                                   | Transformation                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/og.png`      | Open Graph and Twitter social preview, 1730 x 909 PNG | Original project artwork created for Annas M. Ishtiaq on 2026-07-29 from a text-only art-direction process; no third-party image, logo, catalogue artwork, or photographic reference was used. | Copyright © 2026 Annas M. Ishtiaq. All rights reserved. | Losslessly re-encoded to remove embedded tool metadata; an automated check confirms that the reviewed pixel buffer is unchanged and the shipped PNG contains only image-data chunks |
| `public/favicon.svg` | Browser and installed-app icon, 64 x 64 view box      | Original project vector mark authored for Annas M. Ishtiaq; it uses only repository-authored geometric paths and colour tokens.                                                                | Copyright © 2026 Annas M. Ishtiaq. All rights reserved. | Shipped as source SVG with no external fonts, images, scripts, or references                                                                                                        |

The interactive application uses code-generated Three.js geometry, deterministic
procedural background points, and CSS. It does not bundle third-party photographs,
textures, audio, video, or 3D models.

The reviewed, metadata-sanitized asset has SHA-256
`a2208a67aa558bbec4261989edd08f4a4cbf9bd711be59c7a0ea26afede2af41`.

The social card is artwork, not observational data or proof of application
behaviour. It intentionally depicts schematic orbital lines and scale motifs
and must not be cited as a scientific source. `app/layout.tsx` references the
asset for both Open Graph and Twitter metadata.

If imagery is added later, record the creator/provider, source URL, stable asset
identifier, retrieval date, licence, attribution wording, and every transformation
before the asset is admitted to a release.
