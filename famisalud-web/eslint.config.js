export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        FormData: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        URLSearchParams: 'readonly',
        CustomEvent: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Intl: 'readonly',
      },
    },
    rules: {
      // --- Tus reglas actuales ---
      'no-debugger': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': ['warn', { checkLoops: false }],

      // --- Nuevas reglas nativas recomendadas ---
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], // Avisa si creas variables o parámetros que no usas
      'no-undef': 'error',           // Evita que uses variables que no han sido declaradas
      'no-const-assign': 'error',    // Te detiene si intentas cambiar el valor de una constante (const)
      'no-duplicate-imports': 'warn', // Te avisa si importas dos veces del mismo archivo
      'eqeqeq': ['warn', 'always'],  // Sugiere usar === en lugar de == para evitar errores de tipo extraños
      'no-var': 'error',             // Prohíbe el uso del viejo 'var', obligando a usar 'let' o 'const'
      'prefer-const': 'warn',        // Te avisa si usaste 'let' pero la variable nunca cambia de valor
    },
  },
];
