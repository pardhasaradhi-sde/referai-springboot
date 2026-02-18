import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#FFFFFF",
                foreground: "#111111",
                "brand-black": "#111111",
                "brand-gray": "#F5F5F5",
                "brand-accent": "#D1FD00",
            },
            fontFamily: {
                sans: ["var(--font-geist-sans)", "Inter", "Helvetica Neue", "Arial", "sans-serif"],
                display: ["Inter", "Helvetica", "sans-serif"],
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out forwards",
                "dash-flow": "dashFlow 1s linear infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                dashFlow: {
                    "0%": { strokeDashoffset: "20" },
                    "100%": { strokeDashoffset: "0" },
                }
            },
        },
    },
    plugins: [],
};
export default config;
