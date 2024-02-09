import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
    }),
  ],
});
