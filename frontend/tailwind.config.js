/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nov: {
                    blue: '#004B8D',  // Classic NOV Blue
                    dark: '#0B1120',  // Deep background
                    card: '#151E32',  // Card background
                    accent: '#00A3E0', // Cyan accent
                    warning: '#F59E0B',
                    danger: '#EF4444',
                    success: '#10B981',
                }
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'monospace'],
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
