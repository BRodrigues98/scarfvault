import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the Express backend during local dev
    proxy: {
      "/api": "http://localhost:3001",
      "/photos": "http://localhost:3001",
    },
  },
});
