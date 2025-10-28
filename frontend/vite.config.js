import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    port: 5173,
    host: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React and routing
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI Libraries
          'vendor-ui': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs'
          ],

          // Charts and data visualization
          'vendor-charts': ['recharts'],

          // Forms and validation
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Supabase and API
          'vendor-api': ['@supabase/supabase-js', 'axios'],

          // Icons and styling
          'vendor-styling': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],

          // Utilities
          'vendor-utils': ['date-fns', 'next-themes', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'axios',
      'recharts',
      'lucide-react',
      'react-hot-toast'
    ],
    exclude: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
})
