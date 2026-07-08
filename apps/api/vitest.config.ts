import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    root: './',
  },
  plugins: [
    // Enables NestJS decorators + emitDecoratorMetadata under Vitest.
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
