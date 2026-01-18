import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Point this to your source popup.html
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/entry/background/background.js'),
        contentScript: resolve(__dirname, 'src/entry/content/contentScript.js'),
        externalSitesHandler: resolve(__dirname, 'src/entry/external/externalSitesHandler.ts'), // if fail, switch back to js and change manifest
        confirmation: resolve(__dirname, 'src/components/confirmation/confirmationPopup.html')
      },
      output: {
        // This flattens the structure so popup.html ends up in the root of /dist
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});