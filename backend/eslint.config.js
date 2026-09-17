import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.js'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Parameter berawalan _ boleh tidak dipakai (contoh: `_next` di error handler Express).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]);
