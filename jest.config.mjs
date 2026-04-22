export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  cacheDirectory: '.jest-cache',
  transform: {
    '\\.jsx?$': 'babel-jest',
    '\\.mjs$': 'babel-jest'
  },
  collectCoverageFrom: [
    '**/*.{js,jsx}'
  ],
  projects: [{
    displayName: 'unit-tests',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['jest-expect-message', '<rootDir>/jest.setup.js'],
    testMatch: [
      '<rootDir>/src/**/*.test.[jt]s?(x)',
      '<rootDir>/plugins/**/*.test.[jt]s?(x)',
      '<rootDir>/providers/**/*.test.[jt]s?(x)'
    ],
    testPathIgnorePatterns: ['<rootDir>/src/test-utils.js'],
    coveragePathIgnorePatterns: [
      '<rootDir>/src/index.umd.js',
      '<rootDir>/stylelint.config.js',
      '<rootDir>/coverage',
      '<rootDir>/demo',
      '<rootDir>/src/test-utils.js',
      '<rootDir>/plugins/beta/datasets/',
      '<rootDir>/providers/beta/',
      '<rootDir>/plugins/beta/draw-es',
      '<rootDir>/plugins/beta/draw-ml',
      '<rootDir>/plugins/beta/frame',
      '<rootDir>/plugins/beta/map-styles',
      '<rootDir>/plugins/beta/scale-bar',
      '<rootDir>/plugins/beta/use-location',
      '<rootDir>/.docusaurus',
      '<rootDir>/build/assets/js',
      '/dist/'
    ],
    transformIgnorePatterns: []
  }]
}
