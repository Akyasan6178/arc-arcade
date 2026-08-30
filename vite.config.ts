import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite configuration for the arcade platform.
// The alias map mirrors tsconfig.json's "paths" so imports stay short and
// consistent no matter which future game (Pac-Man, Snake, Bomberman, ...)
// is being developed inside this same foundation.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@scenes': path.resolve(__dirname, 'src/scenes'),
      '@systems': path.resolve(__dirname, 'src/systems'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
