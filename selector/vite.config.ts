// Library build: one IIFE script + one CSS file that tools/build.js inlines into the tea room page.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/embed.tsx', name: 'SadoSelectorLib', formats: ['iife'], fileName: () => 'selector.iife.js' },
    cssCodeSplit: false,
    rollupOptions: { output: { assetFileNames: 'selector.[ext]', inlineDynamicImports: true } },
    outDir: 'dist', emptyOutDir: true, minify: true,
  },
});
