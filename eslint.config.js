import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      /**
       * This project is a client-only SPA. Some React Hooks “best practice” rules
       * are too strict for our patterns (initial loads, subscriptions, etc.).
       * Keep correctness + DX while avoiding noisy false positives.
       */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      /**
       * UI primitives often export helpers/variants alongside the component.
       * Fast refresh still works fine here.
       */
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['vite.config.js', 'tailwind.config.js', '**/*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
])
