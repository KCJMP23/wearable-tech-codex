module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    '.expo/',
    '.turbo/',
    'coverage/',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
  ],
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
      extends: ['next/core-web-vitals'],
      settings: {
        next: {
          rootDir: ['apps/web/'],
        },
      },
    },
    {
      files: ['apps/mobile/**/*.{ts,tsx,js,jsx}'],
      plugins: ['@typescript-eslint', 'react', 'react-hooks'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      settings: {
        react: { version: 'detect' },
      },
    },
    {
      files: ['**/*.tsx'],
      plugins: ['@typescript-eslint', 'react'],
      extends: ['plugin:react/recommended'],
      settings: {
        react: { version: 'detect' },
      },
    },
  ],
};
