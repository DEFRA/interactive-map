export default {
  extends: [
    'stylelint-config-gds',
  ],
  plugins: [
    'stylelint-scss',
  ],
  ignoreFiles: [
    'node_modules/**/*',
    'dist/**/*'
  ],
  overrides: [{
    files: ['**/*.scss'],
    rules: {
      // Disable duplicate selectors check in SCSS files only
      'no-duplicate-selectors': null
    }
  },{
      files: ['src/components/**/*.js', 'src/components/**/*.jsx'],
      rules: {
        'react/prop-types': 'off'
      }
  }]
}