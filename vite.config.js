import { defineConfig } from 'vite';

// Relative asset paths make the build work both at / and at
// https://<user>.github.io/<repository>/ on GitHub Pages.
export default defineConfig({
  base: './',
});
