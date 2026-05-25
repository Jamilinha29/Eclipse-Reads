import { copyFileSync, existsSync } from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Garante `dist/404.html` = `index.html` (fallback em hosts estáticos; Vercel usa sobretudo `vercel.json`). */
function spaFallback404(): import("vite").Plugin {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const indexHtml = path.join(dist, "index.html");
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, path.join(dist, "404.html"));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/auth": {
        target: "http://localhost:4100",
        changeOrigin: true,
      },
      "/api/books": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/books/, ""),
      },
      "/api/library": {
        target: "http://localhost:4200",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/library/, ""),
      },
    },
  },
  plugins: [react(), spaFallback404()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@eclipse-reads/shared": path.resolve(__dirname, "../services/backend/shared/src/index.ts"),
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
