import { readFileSync } from 'node:fs';
import process from 'node:process';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: unknown };
const version = typeof packageJson.version === 'string' && packageJson.version ? packageJson.version : 'development';
const sourceCommit = process.env.FRAKON_SOURCE_COMMIT?.trim() || process.env.GITHUB_SHA?.trim() || 'development';

export default defineConfig({
  define: {
    __FRAKON_VERSION__: JSON.stringify(version),
    __FRAKON_SOURCE_COMMIT__: JSON.stringify(sourceCommit),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'frakon-dashboard.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
