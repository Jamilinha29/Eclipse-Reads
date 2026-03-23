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
  },
  plugins: [react(), spaFallback404()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
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
