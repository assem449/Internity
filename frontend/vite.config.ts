import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/entry/background/background.js'),
        contentScript: resolve(__dirname, 'src/entry/content/contentScript.js'),
        externalSitesHandler: resolve(__dirname, 'src/entry/external/externalSitesHandler.js')
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: `[name].[ext]`,
      }
    },
  },
})
