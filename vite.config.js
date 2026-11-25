import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host: true -> auch im WLAN erreichbar (Handy öffnet die Seite über die PC-IP).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
})
