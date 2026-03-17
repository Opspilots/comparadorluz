/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
                "grid-pulse": {
                    "0%, 100%": { opacity: "0.03" },
                    "50%": { opacity: "0.08" },
                },
                "glow-line": {
                    "0%": { opacity: "0", transform: "translateX(-100%)" },
                    "50%": { opacity: "1" },
                    "100%": { opacity: "0", transform: "translateX(100%)" },
                },
                "float-card": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                "pulse-ring": {
                    "0%": { boxShadow: "0 0 0 0 rgba(37, 99, 235, 0.4)" },
                    "70%": { boxShadow: "0 0 0 15px rgba(37, 99, 235, 0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(37, 99, 235, 0)" },
                },
                "scan-line": {
                    "0%": { transform: "translateY(-100%)", opacity: "0" },
                    "10%": { opacity: "1" },
                    "90%": { opacity: "1" },
                    "100%": { transform: "translateY(500px)", opacity: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "grid-pulse": "grid-pulse 4s ease-in-out infinite",
                "glow-line": "glow-line 3s ease-in-out infinite",
                "float-card": "float-card 6s ease-in-out infinite",
                "pulse-ring": "pulse-ring 2s infinite",
                "scan-line": "scan-line 4s linear infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
