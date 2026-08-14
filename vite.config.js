import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` is the repo name because GitHub Pages serves project sites under
// https://<user>.github.io/budget-website/. Only applied to the production
// build so `npm run dev` still serves from root locally.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/budget-website/' : '/',
  plugins: [react()],
}))
