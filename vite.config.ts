import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Chemins absolus : un alias relatif ("./shared") n'est pas
    // résolvable par Rollup depuis un fichier importateur situé
    // ailleurs que la racine (ex. pages/QuotesPage.tsx).
    alias: {
      "@shared": path.resolve(rootDir, "shared"),
      "@": rootDir,
    },
  },
});
