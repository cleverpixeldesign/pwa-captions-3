import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon-196x196.png', 'assets/favicon-128x128.png'],
      manifest: {
        name: 'Hearing Helper',
        short_name: 'Helper',
        description: 'Speech-to-text captions PWA for people who are hard of hearing.',
        theme_color: '#111827',
        background_color: '#0b0f1a',
        display: 'standalone',
        icons: [
          {
            src: 'assets/favicon-196x196.png',
            sizes: '196x196',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/favicon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/favicon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
      }
    })
  ],
  resolve: {
    alias: {
      '@cleverpixel': path.resolve(__dirname, './src/cleverpixel-design-system/src'),
    },
  },
})

