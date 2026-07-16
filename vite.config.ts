import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        topLevelAwait({
            // The export name of top-level await promise for each chunk module
            promiseExportName: "__tla",
            // The function to generate import names of top-level await promise in each chunk module
            promiseImportName: i => `__tla_${i}`
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext',
        },
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
    build: {
        target: 'esnext',
        sourcemap: 'hidden',
        // Default-ish limit now that Login/ConsentSignPage/LegalPage/Blog* are lazy-loaded
        // and out of the entry chunk. pdf-renderer (@react-pdf/renderer, ~1.5MB) and its
        // pdf-utils helper chunk are expected to exceed this — they're already isolated via
        // manualChunks so they only load on the contract PDF preview/generation routes.
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                    ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
                    charts: ['recharts'],
                    'pdf-renderer': ['@react-pdf/renderer'],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
} as UserConfig)
