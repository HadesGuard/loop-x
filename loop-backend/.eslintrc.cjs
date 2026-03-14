module.exports = {
  root: true,
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/**', 'scripts/**', 'load-tests/**', 'docs/**', 'migrations/**'],
  overrides: [
    {
      files: ['src/**/*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-console': 'error'
      }
    }
  ]
};
