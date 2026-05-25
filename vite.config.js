import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-icon.svg", "apple-touch-icon.png", "mask-icon.svg"],
      workbox: {
        navigateFallbackDenylist: [/^\/LoteManager_v32_rento(?:\.html)?/]
      },
      manifest: {
        name: "Ownterra",
        short_name: "Ownterra",
        description: "Ecosistema Ownterra con suites para lotes y rentas inmobiliarias.",
        theme_color: "#183024",
        background_color: "#F6F0E6",
        orientation: "portrait-primary",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "fullscreen"],
        start_url: "/dashboard",
        scope: "/",
        lang: "es-MX",
        categories: ["business", "productivity", "finance"],
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        shortcuts: [
          {
            name: "Lotes",
            short_name: "Lotes",
            description: "Abrir suite de lotes",
            url: "/dashboard"
          },
          {
            name: "Rentas",
            short_name: "Rentas",
            description: "Abrir suite de rentas",
            url: "/dashboard"
          },
          {
            name: "Clientes",
            short_name: "Clientes",
            description: "Abrir cartera de clientes",
            url: "/clientes"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
