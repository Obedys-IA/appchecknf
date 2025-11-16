/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Light Theme - Cores corporativas profissionais
        'light-primary': '#0c6909ff',     // Azul corporativo
        'light-secondary': '#64748b',   // Cinza azulado
        'light-accent': '#0f172a',      // Azul escuro
        'light-bg': '#f8fafc',          // Cinza muito claro
        'light-card': '#ffffff',        // Branco puro
        'light-border': '#e2e8f0',      // Cinza claro
        'light-text': '#1e293b',        // Cinza escuro
        'light-text-secondary': '#64748b', // Cinza médio
        'light-hover': '#f1f5f9',       // Cinza hover sutil
        'light-success': '#059669',     // Verde corporativo
        'light-warning': '#d97706',     // Laranja corporativo
        'light-danger': '#dc2626',      // Vermelho corporativo
        // Dark Theme - Tons corporativos escuros
        'dark-primary': '#24cc07ff',      // Azul mais suave
        'dark-secondary': '#94a3b8',    // Cinza claro
        'dark-accent': '#1e40af',       // Azul escuro
        'dark-bg': '#0F0F0F',           // Preto quase puro
        'dark-card': '#1e293b',         // Cinza azulado escuro
        'dark-border': '#334155',       // Cinza médio
        'dark-text': '#f8fafc',         // Branco suave
        'dark-text-secondary': '#cbd5e1', // Cinza claro
        'dark-hover': '#334155',        // Cinza hover
        'dark-success': '#10b981',      // Verde suave
        'dark-warning': '#f59e0b',      // Laranja suave
        'dark-danger': '#ef4444',       // Vermelho suave
        'dark-cinza': '#262729ff',        // Cinza hover mais escuro
      },
      boxShadow: {
        soft: '0 6px 18px rgba(0,0,0,0.08)',
        glow: '0 0 12px rgba(0, 255, 127, 0.35)'
      },
      borderRadius: {
        xl2: '16px',
        xl3: '20px'
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [],
};