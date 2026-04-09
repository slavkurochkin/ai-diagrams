import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Order matters: match specific packages before generic `react` paths.
          if (id.includes('node_modules/reactflow')) return 'reactflow'
          if (id.includes('node_modules/framer-motion')) return 'framer-motion'
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/mdast') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/remark') ||
            id.includes('node_modules/unified')
          ) {
            return 'markdown'
          }
          if (id.includes('node_modules/lucide-react')) return 'lucide'
          // One chunk for react + react-dom avoids Rollup circular vendor ↔ react-dom warnings.
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@fontsource')) return 'fonts'

          // Let Rollup place other dependencies (avoids artificial vendor ↔ react cycles).
          return undefined
        },
      },
    },
  },
})
