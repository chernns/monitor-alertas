import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import tailwindcss from "@tailwindcss/vite";   // novo import, junto dos outros

export default defineConfig({
  plugins: [react(), tailwindcss()],            // acrescente tailwindcss() aqui
});

