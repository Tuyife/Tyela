import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/avatars': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true }
    }
  },
})
