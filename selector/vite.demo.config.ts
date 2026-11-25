// Standalone demo page (index.html + src/main.tsx) for developing the selector on its own.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { outDir: 'demo-dist', emptyOutDir: true } });
