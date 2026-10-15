import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Electron için kritik: Dosya yollarını mutlak (/) yerine göreceli (./) yapar.
  // Bu sayede file:// protokolü üzerinden assetler yüklenebilir.
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});