import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // in sviluppo, /api punta a `vercel dev` (o un mock) sulla porta 3000;
    // in produzione Vercel serve /api automaticamente, non serve proxy
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
