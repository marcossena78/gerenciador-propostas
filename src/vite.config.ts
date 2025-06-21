import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()], // Plugin React essencial
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env': process.env // Adicionado para compatibilidade
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // Corrigido para apontar para src/
      }
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      open: true // Abre o navegador automaticamente
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.html')
    }
  };
});