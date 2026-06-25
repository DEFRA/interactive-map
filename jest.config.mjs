export default {
  workerIdleMemoryLimit: '512MB',
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
      '<rootDir>/plugins/datasets/',
      '<rootDir>/providers/esri/',
      '<rootDir>/providers/openlayers/',
      '<rootDir>/providers/open-names/',
      '<rootDir>/plugins/draw-es/',
      '<rootDir>/plugins/draw-ml/',
      '<rootDir>/plugins/frame/',
      '<rootDir>/plugins/map-styles/',
      '<rootDir>/plugins/scale-bar/',
      '<rootDir>/plugins/use-location/',
      '<rootDir>/.docusaurus',
      '<rootDir>/build/assets/js',
      '/dist/'
    ],
    transformIgnorePatterns: []
  }]
}
