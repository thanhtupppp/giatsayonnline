import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// Yêu Cầu 12, Criteria 8: Minify and compress CSS/JS
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && basicSsl(),
  ].filter(Boolean),
  server: {
    host: true, // Expose on local network for mobile testing
  },
  build: {
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
    // Generate source maps for debugging
    sourcemap: false,
    // Chunk size warning threshold
    chunkSizeWarningLimit: 500,
  },
}))
