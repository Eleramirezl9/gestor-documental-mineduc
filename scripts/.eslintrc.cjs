module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^[A-Z_]'
    }],
    'no-console': 'off'
  },
  overrides: [
    {
      files: ['*.js'],
      env: {
        commonjs: true
      },
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['*.mjs'],
      parserOptions: {
        sourceType: 'module'
      }
    }
  ]
};