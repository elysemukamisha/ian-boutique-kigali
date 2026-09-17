import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: { port: 3000, open: true },
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        staff: resolve(__dirname, 'staff.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
});
