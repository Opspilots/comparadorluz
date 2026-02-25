/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// Deno namespace for Supabase Edge Functions to prevent IDE errors
declare namespace Deno {
    export const env: {
        get(key: string): string | undefined;
    };
    export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
