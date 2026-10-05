import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  // Lu uniquement pour connaître le port du serveur de jeu : rien du .env n'est injecté dans le client
  const env = loadEnv(mode, projectRoot, '');
  const serverPort = env.PORT || 3100;

  return {
    root: 'client',
    plugins: [vue()],
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/ws': { target: `ws://127.0.0.1:${serverPort}`, ws: true },
        '/api': { target: `http://127.0.0.1:${serverPort}` }
      }
    }
  };
});
