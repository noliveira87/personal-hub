import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: path.resolve(__dirname, "../../"),
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared-ui": path.resolve(__dirname, "../libs/ui/src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@supabase/supabase-js")) return "vendor-supabase";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("react-router") || id.includes("@remix-run")) return "vendor-router";

          if (
            id.includes("@radix-ui/react-dialog") ||
            id.includes("@radix-ui/react-alert-dialog") ||
            id.includes("@radix-ui/react-dropdown-menu") ||
            id.includes("@radix-ui/react-popover") ||
            id.includes("@radix-ui/react-tooltip") ||
            id.includes("@radix-ui/react-context-menu") ||
            id.includes("@radix-ui/react-hover-card") ||
            id.includes("vaul")
          ) {
            return "vendor-ui-overlay";
          }

          if (
            id.includes("@radix-ui/react-select") ||
            id.includes("@radix-ui/react-checkbox") ||
            id.includes("@radix-ui/react-label") ||
            id.includes("@radix-ui/react-radio-group") ||
            id.includes("@radix-ui/react-switch") ||
            id.includes("@radix-ui/react-slider") ||
            id.includes("input-otp") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform/resolvers") ||
            id.includes("zod")
          ) {
            return "vendor-ui-forms";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("sonner") ||
            id.includes("embla-carousel-react") ||
            id.includes("react-resizable-panels") ||
            id.includes("next-themes")
          ) {
            return "vendor-ui-core";
          }

          if (id.includes("react-day-picker") || id.includes("date-fns")) return "vendor-dates";
          if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
        },
      },
    },
  },
}));
