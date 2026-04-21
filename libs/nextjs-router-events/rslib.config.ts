import { defineConfig } from '@rslib/core'
import path from 'node:path'

const distPath = path.resolve(__dirname, './dist')

export default defineConfig({
  source: {
    entry: {
      index: [
        './src/**',
        '!./src/**/*.spec.ts',
        '!./src/**/*.spec.tsx',
        '!./src/**/*.test.ts',
        '!./src/**/*.test.tsx',
      ],
    },
    tsconfigPath: './tsconfig.build.json',
  },
  output: {
    target: 'web',
    distPath: {
      root: distPath,
    },
    cleanDistPath: true,
  },
  lib: [
    {
      format: 'esm',
      bundle: false,
      redirect: {
        js: {
          path: true,
          extension: true,
        },
        dts: {
          path: true,
          extension: true,
        },
      },
      autoExternal: {
        dependencies: true,
        optionalDependencies: true,
        peerDependencies: true,
      },
      dts: {
        distPath,
      },
    },
  ],
})
