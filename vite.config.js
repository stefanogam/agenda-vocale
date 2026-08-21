import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// La versione viene letta da package.json e iniettata nel codice: unica
// fonte di verità, impossibile che quella mostrata nell'app sia diversa
// da quella reale del rilascio.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
