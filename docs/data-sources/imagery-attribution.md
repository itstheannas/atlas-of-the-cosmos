# Imagery and project-asset attribution

## Bundled assets

| Asset                | Purpose                                               | Origin                                                                                                                                                                                         | Licence / rights note                                   | Transformation                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/og.png`      | Open Graph and Twitter social preview, 1730 x 909 PNG | Original project artwork created for Annas M. Ishtiaq on 2026-07-29 from a text-only art-direction process; no third-party image, logo, catalogue artwork, or photographic reference was used. | Copyright © 2026 Annas M. Ishtiaq. All rights reserved. | Losslessly re-encoded to remove embedded tool metadata; an automated check confirms that the reviewed pixel buffer is unchanged and the shipped PNG contains only image-data chunks |
| `public/favicon.svg` | Browser and installed-app icon, 64 x 64 view box      | Original project vector mark authored for Annas M. Ishtiaq; it uses only repository-authored geometric paths and colour tokens.                                                                | Copyright © 2026 Annas M. Ishtiaq. All rights reserved. | Shipped as source SVG with no external fonts, images, scripts, or references                                                                                                        |

The interactive application uses code-generated Three.js geometry, deterministic
procedural background points, and CSS. It does not bundle third-party photographs,
textures, audio, video, or 3D models.

## Procedural Solar System surfaces

The named Solar System bodies are drawn by original project shaders in
`app/components/scene/planetary-bodies.ts`. Every surface, ring, and glow is
computed mathematically at run time; no image or texture is loaded, embedded,
or redistributed.

Those shaders are driven by the reviewed parameter table in
`lib/planetary-appearance.ts`, which mixes two kinds of borrowed knowledge:

| Parameter                                                  | Origin                                                                                                                                     | Rights note                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Equatorial radii, obliquity, sidereal rotation, ring edges | Transcribed factual measurements from the NASA/NSSDCA planetary fact sheets, cited through the `nasa-solar-system` source id               | Factual data, cited in the product's source registry alongside every other scientific value                                       |
| Surface palettes and band/feature structure                | Hand-matched approximations of the colour relationships visible in published NASA/ESA mission imagery, recorded per body in `paletteBasis` | No pixels are copied. The resulting shader code and rendered artwork are original project work, Copyright © 2026 Annas M. Ishtiaq |

The rendered result is an **illustrative depiction**, not observational
imagery. It must never be presented as a photograph, cited as an observation,
or measured. Relative body sizes are deliberately compressed for legibility,
and the interface states this at the point of use.

If a real mission photograph is ever introduced, it must be added to the
bundled-asset table above with its own provider, licence, and attribution
record; it cannot inherit this section's rights position.

The reviewed, metadata-sanitized asset has SHA-256
`a2208a67aa558bbec4261989edd08f4a4cbf9bd711be59c7a0ea26afede2af41`.

The social card is artwork, not observational data or proof of application
behaviour. It intentionally depicts schematic orbital lines and scale motifs
and must not be cited as a scientific source. `app/layout.tsx` references the
asset for both Open Graph and Twitter metadata.

If imagery is added later, record the creator/provider, source URL, stable asset
identifier, retrieval date, licence, attribution wording, and every transformation
before the asset is admitted to a release.
