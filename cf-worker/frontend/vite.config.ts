import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mermaid: ['mermaid'],
          motion: ['framer-motion'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
