export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  cacheDirectory: '.jest-cache',
  transform: {
    '\\.jsx?$': 'babel-jest',
    '\\.mjs$': 'babel-jest'
  },
  projects: [{
    displayName: 'unit-tests',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
      '<rootDir>/src/**/*.test.[jt]s?(x)',
      '<rootDir>/plugins/**/*.test.[jt]s?(x)',
      '<rootDir>/providers/**/*.test.[jt]s?(x)'
    ],
    testPathIgnorePatterns: ['<rootDir>/src/test-utils.js'],
    coveragePathIgnorePatterns: ['<rootDir>/src/test-utils.js'],
    transformIgnorePatterns: []
  }]
}