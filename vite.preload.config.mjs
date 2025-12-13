import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
    minify: false,
    emptyOutDir: false,
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
  },
});
