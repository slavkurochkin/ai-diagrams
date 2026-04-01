import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: {
          bg: '#0F1117',
        },
        // Node accent colors — one entry per node type
        node: {
          llm: '#7C3AED',
          prompt: '#2563EB',
          vectordb: '#0891B2',
          agent: '#059669',
          retriever: '#D97706',
          chunker: '#DC2626',
          embedding: '#7C3AED',
          router: '#DB2777',
          tool: '#EA580C',
          memory: '#CA8A04',
          evaluator: '#16A34A',
          guardrails: '#6D28D9',
        },
        // Port type colors
        port: {
          text: '#94A3B8',
          embedding: '#0891B2',
          'tool-call': '#EA580C',
          memory: '#CA8A04',
          structured: '#16A34A',
          any: '#6B7280',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
