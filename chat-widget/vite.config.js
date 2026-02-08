import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      emitCss: false
    })
  ],
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ChatWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `chat-widget.${format}.js`
    }
  }
});
