import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: reemplazá 'flowcash' con el nombre exacto de tu repositorio de GitHub
// Por ejemplo, si tu repo se llama "mis-finanzas", cambiá '/flowcash/' por '/mis-finanzas/'
export default defineConfig({
  plugins: [react()],
  base: '/FlowCash/',   // ← nombre de tu repo entre barras
})
