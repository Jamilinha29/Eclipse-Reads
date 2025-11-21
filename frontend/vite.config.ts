import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/ (documentação do Vite)
export default defineConfig(async ({ mode }) => {
  let componentTaggerPlugin: any = undefined;

  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      componentTaggerPlugin = mod && (mod.componentTagger ? mod.componentTagger() : undefined);
    } catch (e) {
      // Se o pacote não existir, continuamos sem o plugin de dev
      // eslint-disable-next-line no-console
      console.warn("lovable-tagger não encontrado — seguindo sem ele.", e);
      componentTaggerPlugin = undefined;
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), componentTaggerPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
