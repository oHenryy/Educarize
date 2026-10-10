import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['socket.io-client'],
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em arquivos próprios: mudam pouco e ficam em cache entre versões do app.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          realtime: ['socket.io-client', 'axios'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
})
