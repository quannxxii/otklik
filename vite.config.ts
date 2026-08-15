import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Отклик",
        short_name: "Отклик",
        description: "Трекер откликов и Vacancy Radar",
        theme_color: "#0c1222",
        background_color: "#eef1f6",
        display: "standalone",
        lang: "ru",
        start_url: "/app",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
