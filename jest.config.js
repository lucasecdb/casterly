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
    {
      displayName: 'typescript-app',
      testMatch: ['<rootDir>/test/integration/typescript/**/*.test.[jt]s?(x)'],
      setupFilesAfterEnv: [
        '<rootDir>/test/integration/typescript/jest/setup.js',
      ],
      globalSetup: '<rootDir>/test/integration/typescript/jest/global-setup.js',
      globalTeardown:
        '<rootDir>/test/integration/typescript/jest/global-teardown.js',
    },
    {
      displayName: 'async-modules-app',
      testMatch: [
        '<rootDir>/test/integration/async-modules/**/*.test.[jt]s?(x)',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/test/integration/async-modules/jest/setup.js',
      ],
      globalSetup:
        '<rootDir>/test/integration/async-modules/jest/global-setup.js',
      globalTeardown:
        '<rootDir>/test/integration/async-modules/jest/global-teardown.js',
    },
  ],
}
