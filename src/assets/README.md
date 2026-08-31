# assets/

Organizational home for source asset references used by `PreloadScene`
(sprite sheets, spritesheets/atlases, audio, fonts, tilemaps).

Actual binary asset files are typically served by Vite as static files
from a top-level `public/` folder (already present at the project root)
so they're copied verbatim to the build output; this `src/assets/` folder
is reserved for asset *manifests*/*keys* and any TypeScript describing what
to load and how, per game (e.g. `assets/dx-ball/manifest.ts`).

Intentionally empty of actual binary assets so far — no image/audio files
exist yet. DXB-10 adds the first manifest file, `dx-ball/audio-manifest.ts`
(currently an empty `DX_BALL_AUDIO_MANIFEST` array). DXB-22 names the
theme-music keys a future file drop would use; until then, theme beds
play through `AudioManager.playMusic`'s synthesized fallback (see
`entities/dx-ball/audioCues.ts`). `PreloadScene` already loads every
manifest entry.
