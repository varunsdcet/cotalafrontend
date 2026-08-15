import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { cotalaCanadaProxy } from "./vite-plugin-cotala-proxy";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
    cotalaCanadaProxy(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  css: {
    postcss: {
      plugins: [],
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: true,

    // ✅ ADD THIS PROXY
    proxy: {
      // /cotala-api is handled by cotalaCanadaProxy so requests
      // look like the live Canada portal at /newcotala24/.
      "/zeptomail": {
        target: "https://api.zeptomail.in",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zeptomail/, ""),
      },
      // Proxy scrape API to avoid CORS (browser → same origin → goyoga.ai)
      "/api/validator/scrape": {
        target: "https://goyoga.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // Feature sheet layout images (GET /api/api/select-images?tour_id=…)
      "/api/api/select-images": {
        target: "https://goyoga.ai",
        changeOrigin: true,
        secure: true,
      },
    },

    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
