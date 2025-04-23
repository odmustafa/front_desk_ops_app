// ESLint configuration for Node.js/Electron (ES2022+)

/** @type {import('eslint').Linter.FlatConfig} */
module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      // You can add more rules or plugins as needed
      semi: ["error", "always"],
      "no-unused-vars": ["warn"],
      "no-undef": "error",
      "no-console": "off",
    },
  },
];
