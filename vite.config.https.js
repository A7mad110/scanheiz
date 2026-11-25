import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS-Variante: das iPhone erlaubt die Kamera nur in einem "sicheren"
// Kontext. Über http://<PC-IP> bleibt getUserMedia gesperrt, über
// https://<PC-IP>:5174 (Zertifikat einmal bestätigen) funktioniert sie.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: { host: true, port: 5174, strictPort: true, https: true },
})
