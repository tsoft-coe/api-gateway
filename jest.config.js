module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/server.js'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  coverageReporters: ['text', 'lcov', 'cobertura', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
