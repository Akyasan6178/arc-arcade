# assets/

Organizational home for source asset references used by `PreloadScene`
(sprite sheets, spritesheets/atlases, audio, fonts, tilemaps).

Actual binary asset files are typically served by Vite as static files
from a top-level `public/` folder (already present at the project root)
so they're copied verbatim to the build output; this `src/assets/` folder
is reserved for asset *manifests*/*keys* and any TypeScript describing what
to load and how, per game (e.g. `assets/dx-ball/manifest.ts`).

Intentionally empty for now — no assets have been added yet.
