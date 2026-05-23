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
      manifest: {
        name: "Ownterra",
        short_name: "Ownterra",
        description: "Plataforma de gestión y administración de lotes y propiedades inmobiliarias.",
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
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Abrir resumen operativo",
            url: "/dashboard"
          },
          {
            name: "Clientes",
            short_name: "Clientes",
            description: "Abrir cartera de clientes",
            url: "/clientes"
          },
          {
            name: "Alertas",
            short_name: "Alertas",
            description: "Revisar alertas críticas",
            url: "/alertas"
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
