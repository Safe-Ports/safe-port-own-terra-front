import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Token para subir source maps a Sentry. Solo está presente en los builds de
// deploy (se exporta como variable de entorno SENTRY_AUTH_TOKEN). Sin él, el
// build funciona igual pero no sube source maps.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production" && !env.VITE_API_URL?.trim()) {
    throw new Error("VITE_API_URL es obligatoria para generar el build de producción");
  }

  return {
  // Versión desplegada, congelada en el build. La pasan los scripts de deploy:
  // el tag de git en prod (v1.1.0) y rama-commit en dev. En `npm run dev` queda
  // "dev". Es lo que permite confirmar qué build está sirviendo Cloudflare.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || "dev"),
  },
  // Genera source maps solo cuando vamos a subirlos (no se exponen en el sitio:
  // el plugin de Sentry los borra del dist tras subirlos).
  build: {
    sourcemap: Boolean(sentryAuthToken),
  },
  plugins: [
    react(),
    VitePWA({
      // Service worker DESACTIVADO. Generamos un SW "auto-destructivo" para limpiar el
      // SW viejo de quien ya lo tenía (el navegador revisa /sw.js solo y lo reemplaza,
      // que se desregistra + limpia cachés). PERO NO reinyectamos el registro en la app
      // (injectRegister: false): si lo dejáramos, la app volvería a registrar el SW,
      // que al auto-destruirse recarga la página, y se re-registra → BUCLE de recargas.
      // Con esto: visitantes nuevos = sin SW (siempre fresco); usuarios viejos = se
      // auto-limpian una vez, sin bucle. Se pierde offline/instalar (no crítico).
      selfDestroying: true,
      injectRegister: false,
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
        start_url: "/ecosistema",
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
            name: "Ecosistema",
            short_name: "Ecosistema",
            description: "Abrir panel principal de OwnTerra",
            url: "/ecosistema"
          },
          {
            name: "OwnTerra Lands",
            short_name: "Lands",
            description: "Abrir resumen operativo de lotes",
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
      },
      workbox: {
        // La versión nueva toma control de inmediato (no espera a cerrar pestañas)
        // y limpia los precachés viejos, para minimizar el hueco de "chunk viejo"
        // tras un deploy. Combinado con el handler de vite:preloadError (main.jsx),
        // un deploy nunca deja al usuario con la app rota.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
    // Sube los source maps a Sentry para tener stack traces legibles.
    // Solo se activa si hay SENTRY_AUTH_TOKEN (en los builds de deploy).
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            org: "safe-ports",
            project: "javascript-react",
            authToken: sentryAuthToken,
          }),
        ]
      : []),
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
  };
});
