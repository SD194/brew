import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3001 },
  envDir: '../'            // share the .env from the parent project
});
