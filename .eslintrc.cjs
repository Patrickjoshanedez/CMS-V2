module.exports = {
  root: true,
  ignorePatterns: ['server/**/*.ts'],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      files: ['client/**/*.{js,jsx}'],
      plugins: ['react', 'react-hooks', 'tailwindcss'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:tailwindcss/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        // Enforce deterministic Tailwind class ordering to eliminate merge conflicts
        'tailwindcss/classnames-order': 'warn',
        // Prevent rogue custom class names outside the Tailwind design system
        'tailwindcss/no-custom-classname': 'warn',
        // Merge redundant utility classes into their shorthand equivalents
        'tailwindcss/enforces-shorthand': 'warn',
      },
    },
  ],
};
