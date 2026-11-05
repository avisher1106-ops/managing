import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 is often taken by another project, so use a fixed free port.
    port: 5180,
    strictPort: true,
    // Listen on IPv4 too (localhost can resolve to ::1 only on some machines).
    host: true,
    // Every /api call is forwarded to the Python server during development.
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
});
