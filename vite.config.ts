import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

// Dev-only: forward server secrets from the sandbox environment into the
// local Worker runtime, which does not inherit process.env. Never applied to
// production builds, so secrets are not written into build output.
const DEV_SECRET_NAMES = ["NVIDIA_API_KEY", "NVIDIA_API_KEY_ASR", "LOVABLE_API_KEY"];

export default defineConfig(({ command }) => ({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      ...(command === "serve"
        ? {
            config: {
              vars: Object.fromEntries(
                DEV_SECRET_NAMES.filter((n) => process.env[n]).map((n) => [n, process.env[n]!]),
              ),
            },
          }
        : {}),
    }),
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: [
        "favicon.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-192.png",
        "icon-maskable-512.png",
      ],
      manifest: false,
      workbox: {
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//, /^\/_serverFn\//, /^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-html",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:js|css|woff2?)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "app-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:png|svg|webp|ico|jpg|jpeg)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "app-images",
              expiration: { maxEntries: 120, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
}));
