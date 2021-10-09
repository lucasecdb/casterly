module.exports = {
  projects: [
    {
      displayName: 'production-app',
      testMatch: ['<rootDir>/test/integration/production/**/*.test.[jt]s?(x)'],
      setupFilesAfterEnv: [
        '<rootDir>/test/integration/production/jest/setup.js',
      ],
      globalSetup: '<rootDir>/test/integration/production/jest/global-setup.js',
      globalTeardown:
        '<rootDir>/test/integration/production/jest/global-teardown.js',
    },
    {
      displayName: 'development-app',
      testMatch: ['<rootDir>/test/integration/development/**/*.test.[jt]s?(x)'],
      setupFilesAfterEnv: [
        '<rootDir>/test/integration/development/jest/setup.js',
      ],
      globalSetup:
        '<rootDir>/test/integration/development/jest/global-setup.js',
      globalTeardown:
        '<rootDir>/test/integration/development/jest/global-teardown.js',
    },
    {
      displayName: 'react-18-app',
      testMatch: ['<rootDir>/test/integration/react-18/**/*.test.[jt]s?(x)'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/react-18/jest/setup.js'],
      globalSetup: '<rootDir>/test/integration/react-18/jest/global-setup.js',
      globalTeardown:
        '<rootDir>/test/integration/react-18/jest/global-teardown.js',
    },
  ],
}
