import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${env.VITE_DEV_API_PORT || 4000}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../server/public',
      emptyOutDir: true,
    },
  };
});
