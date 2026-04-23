import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
      },
    },
  },
  plugins: [tailwindcss(), viteReact()],
})

export default config
