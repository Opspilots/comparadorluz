/**
 * Self-hosted Outfit font — replaces the old Google Fonts CDN <link> in index.html.
 *
 * Only the weights actually referenced in the codebase are loaded (verified via
 * `grep -rn "font-\(light\|normal\|medium\|semibold\|bold\|extrabold\)\b"` across
 * `src/` plus a scan of inline `fontWeight:` styles): 400, 500, 600, 700, 800.
 * Weight 300 (font-light) is never used anywhere in the app and was dropped —
 * it was previously downloaded on every page load for nothing.
 *
 * Each import below pulls only the `latin` subset from @fontsource/outfit,
 * which is sufficient for Spanish (ñ, á, é, í, ó, ú, ü all live inside the
 * Latin-1 Supplement range the `latin` subset covers) — the unscoped
 * `@fontsource/outfit/{weight}.css` files also ship latin-ext/cyrillic/
 * vietnamese @font-face blocks we don't need.
 *
 * Weight 800 (font-extrabold — Hero H1, nav logo, every section heading) is
 * NOT imported here on purpose: it's hand-declared in src/index.css pointing
 * at the same /fonts/outfit-800.woff2 file preloaded in index.html. Importing
 * it a second time via @fontsource would make the browser fetch the identical
 * bytes twice under two different (hashed vs. static) URLs.
 *
 * Import this module once, as early as possible (see src/main.tsx).
 */
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
