import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Electron için kritik: Dosya yollarını mutlak (/) yerine göreceli (./) yapar.
  // Bu sayede file:// protokolü üzerinden assetler yüklenebilir.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
