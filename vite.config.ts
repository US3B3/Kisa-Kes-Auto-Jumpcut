import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const premiere = mode === 'premiere';
  return {
    plugins: [
      react(),
      tailwindcss(),
      // CEP paneli file:// üzerinden ES modül yükleyemez: klasik script olarak bağla
      premiere && {
        name: 'cep-classic-script',
        transformIndexHtml: (html: string) =>
          html.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, ''),
      },
    ],
    // Electron için kritik: Dosya yollarını mutlak (/) yerine göreceli (./) yapar.
    // Bu sayede file:// protokolü üzerinden assetler yüklenebilir.
    base: './',
    // Premiere 2026'nın CEP'i Chromium 99: Tailwind v4'ün oklch/color-mix renklerini rgb'ye çevir
    css: premiere ? { transformer: 'lightningcss' as const, lightningcss: { targets: { chrome: 99 << 16 } } } : undefined,
    build: {
      target: premiere ? 'chrome99' : undefined,
      cssMinify: premiere ? 'lightningcss' as const : undefined,
      outDir: premiere ? 'premiere/panel' : 'dist',
      emptyOutDir: true,
      modulePreload: !premiere,
      rollupOptions: premiere ? { output: { format: 'iife' as const } } : undefined,
    },
  };
});
