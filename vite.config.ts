import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_URL ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Wappen_Niedergailbach.png'],
      manifest: {
        name: 'Kassensystem',
        short_name: 'Kasse',
        description: 'Offline-fähige Kassen-App für Events',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'Wappen_Niedergailbach.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
