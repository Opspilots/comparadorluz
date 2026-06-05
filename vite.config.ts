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
        chunkSizeWarningLimit: 1600,
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
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
    },
} as UserConfig)
