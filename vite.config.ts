import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Get repository name for GitHub Pages deployment
const getBase = () => {
  // For GitHub Pages deployment via CI/CD
  if (process.env.GITHUB_PAGES === "true" || process.env.CI === "true") {
    const repoName = process.env.REPO_NAME || "cisco-sre-agenticops-intelligence-dashboard-x-v2.0";
    // Public GitHub Pages: https://<user>.github.io/<repo>/
    // Cisco GitHub Enterprise Pages: /pages/<user>/<repo>/
    if (process.env.CISCO_GH === "true") {
      const pagesUser = process.env.GH_PAGES_USER || "FutureTechVision-IN";
      return `/pages/${pagesUser}/${repoName}/`;
    }
    return `/${repoName}/`;
  }
  // For Cisco internal production
  if (process.env.CISCO_PRODUCTION === "true") {
    return "/fnip/dashboard/";
  }
  // Local development
  return "/";
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared-types"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "frontend"),
  // Dynamic base path for different deployment environments
  base: getBase(),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      }
    },
    chunkSizeWarningLimit: 600,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Optimized chunk splitting for better caching and parallel loading
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('react')) {
              return 'vendor';
            }
            if (id.includes('radix-ui')) {
              return 'ui';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor';
            }
            return 'vendor';
          }
          // Component-based splitting
          if (id.includes('ComprehensiveStatsDashboard')) {
            return 'stats';
          }
        },
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name ?? assetInfo.names?.[0] ?? '').split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp|webm|woff2?|ttf|otf|eot/.test(ext)) {
            return `assets/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `assets/[name]-[hash].css`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js'
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
