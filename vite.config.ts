import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  /* Rutas relativas: así la página funciona igual servida en la raíz
     (localhost) que en un subdirectorio de GitHub Pages, que es donde
     queda publicada en `usuario.github.io/repo/` */
  base: './',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
