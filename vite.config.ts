import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@config": path.resolve(__dirname, "src/config"),
      "@scenes": path.resolve(__dirname, "src/scenes"),
      "@entities": path.resolve(__dirname, "src/entities"),
      "@systems": path.resolve(__dirname, "src/systems"),
      "@data": path.resolve(__dirname, "src/data"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@types": path.resolve(__dirname, "src/types")
    }
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
