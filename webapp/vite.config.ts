import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/login": "http://localhost:8080",
      "/api": "http://localhost:8080",
    },
  },
  plugins: [
    react(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "My Paste",
        short_name: "My Paste",
        icons: [
          {
            src: "IconMyPaste.svg",
            sizes: "56x56",
            type: "image/svg",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/login/],
      },
    }),
  ],
});
