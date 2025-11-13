import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon.png', 'assets/app-icons/192.png', 'assets/app-icons/512.png', 'assets/clever-pixel-hear-buddy.png'],
      manifest: {
        name: 'Hear Buddy',
        short_name: 'Buddy',
        description: 'Speech-to-text captions PWA for people who are hard of hearing.',
        theme_color: '#111827',
        background_color: '#0b0f1a',
        display: 'standalone',
        icons: [
          {
            src: 'assets/app-icons/48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'assets/app-icons/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,xml,txt}']
      }
    })
  ],
  resolve: {
    alias: {
      '@cleverpixel': path.resolve(__dirname, './src/cleverpixel-design-system/src'),
    },
  },
})

