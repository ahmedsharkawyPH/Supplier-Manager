import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Supabase chunk removed to let Vite handle it and avoid circular deps/init issues
            return 'vendor';
          }
        },
      },
    },
  },
});