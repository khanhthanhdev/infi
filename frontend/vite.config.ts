import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tauri exposes the target platform via `TAURI_PLATFORM`. Pin Vite's build
// target to the actual WebView engine family (Edge WebView2 on Windows,
// WKWebView/WebKit elsewhere) so we ship smaller bundles and avoid
// unnecessary polyfills.
const tauriPlatform = process.env.TAURI_PLATFORM;
const tauriDebug = !!process.env.TAURI_DEBUG;
const buildTarget =
  tauriPlatform === 'windows' ? 'chrome105' : 'safari15';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  build: {
    target: buildTarget,
    minify: tauriDebug ? false : 'esbuild',
    sourcemap: tauriDebug,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@tauri-apps')) {
            return 'vendor-tauri';
          }

          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }

          if (id.includes('@radix-ui') || id.includes('radix-ui')) {
            return 'vendor-radix';
          }

          if (id.includes('@phosphor-icons') || id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (
            id.includes('react-markdown') ||
            id.includes('remark-') ||
            id.includes('micromark') ||
            id.includes('mdast-') ||
            id.includes('hast-') ||
            id.includes('highlight.js') ||
            id.includes('dompurify')
          ) {
            return 'vendor-markdown';
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
