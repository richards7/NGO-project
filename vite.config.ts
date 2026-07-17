// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico"],
        manifest: {
          name: "Arogya Camp OS — Medical NGO Camp Management",
          short_name: "Arogya",
          description: "Offline-first medical camp management for NGOs. Register patients, capture vitals, consult, and dispense — even without internet.",
          theme_color: "#2563eb",
          background_color: "#0a0a0f",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          // Pre-cache all static assets so the app loads offline
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          // Don't cache the PowerSync WASM worker files in the SW precache —
          // they are loaded by PowerSync's own worker system
          globIgnores: ["**/node_modules/**", "**/@powersync/**"],
          // Runtime caching for API calls (optional fallback)
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/localhost:5001\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 1 day
                },
              },
            },
          ],
        },
      }),
    ],
    // Required for PowerSync WASM modules
    optimizeDeps: {
      exclude: ["@journeyapps/wa-sqlite", "@powersync/web"],
    },
    worker: {
      format: "es",
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
