/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Nom du repo GitHub — mettre à jour si le repo est renommé
  base: '/sport-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sport App',
        short_name: 'Sport',
        description: 'Suivi cuisine, diet et sport — Marc & Mélanie',
        lang: 'fr',
        display: 'standalone',
        start_url: '.',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      // Les icônes sont déjà pré-cachées par le glob **/*.png : on désactive la
      // seconde injection via manifest.icons sinon chaque icône est precachée 2×.
      includeManifestIcons: false,
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
})
