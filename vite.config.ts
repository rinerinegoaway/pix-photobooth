import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development the signaling server runs separately (`bun run dev` starts both).
const signaling = process.env.SIGNALING_ORIGIN ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ws': { target: signaling, ws: true },
      '/api': { target: signaling },
    },
  },
})
