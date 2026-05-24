import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const adsenseClient = env.VITE_ADSENSE_CLIENT?.trim() ?? "";
  const shouldInjectAdSense = /^ca-pub-\d{16}$/.test(adsenseClient);

  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [
      react(),
      {
        name: "mylovecat-adsense-html",
        transformIndexHtml() {
          if (!shouldInjectAdSense) return [];

          return [
            {
              tag: "meta",
              attrs: {
                name: "google-adsense-account",
                content: adsenseClient,
              },
              injectTo: "head",
            },
            {
              tag: "script",
              attrs: {
                id: "mylovecat-adsense",
                async: true,
                src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`,
                crossorigin: "anonymous",
              },
              injectTo: "head",
            },
          ];
        },
      },
    ],
    build: {
      minify: "oxc",
      sourcemap: false,
      rolldownOptions:
        mode === "production"
          ? {
              output: {
                minify: {
                  compress: {
                    dropConsole: true,
                    dropDebugger: true,
                  },
                },
              },
            }
          : undefined,
    },
  };
});
