import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
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
                manualChunks: (id: string) => {
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
                        return 'vendor';
                    }
                    if (id.includes('node_modules/@supabase')) {
                        return 'supabase';
                    }
                    if (id.includes('node_modules/@radix-ui')) {
                        return 'ui';
                    }
                    if (id.includes('node_modules/recharts')) {
                        return 'charts';
                    }
                    if (id.includes('node_modules/@react-pdf')) {
                        return 'pdf-renderer';
                    }
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
} as UserConfig)
