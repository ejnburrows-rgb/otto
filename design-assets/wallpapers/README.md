# OTTO CRM approved wallpaper assets

These assets came directly from the user-provided reference images for the OTTO CRM redesign. They are source assets, not inspiration to be re-created or restyled.

## Mapping

- **Julio Pablo** → `julio-pablo.avif` — mountain landscape with the glowing rose.
- **Sarays** → `sarays.avif` — pink/purple city-at-night scene.
- **Otto** → wallpaper has **not** been supplied in this handoff. Do not invent one.

## Materialize the images

The ChatGPT GitHub connector can write repository text but cannot directly upload the local binary attachments. The exact image data has therefore been committed as Base64 fragments under `_encoded/`.

Run from the repository root:

```bash
node scripts/materialize-otto-wallpapers.mjs
```

This writes:

- `design-assets/wallpapers/julio-pablo.avif`
- `design-assets/wallpapers/sarays.avif`

Verify both images visually before using them. Then wire them into the CRM's actual static-asset structure as appropriate. Do not recolor, regenerate, reinterpret, or replace them. Preserve the full wallpaper composition; use responsive `cover`/positioning carefully so important artwork is not unnecessarily cropped.

The generated AVIF files retain the full 1536×857 composition. If the application's supported browser policy requires another web format, convert these generated files locally without altering the artwork.
