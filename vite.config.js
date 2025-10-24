import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/control-money-app/', // 👈 ESSA LINHA É O SEGREDO
})
