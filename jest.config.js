/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@agent-expo/(.*)$': '<rootDir>/packages/$1/src',
    // Handle .js extension in imports (for ESM compat)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Transform ESM modules that Jest can't parse (handle pnpm nested structure)
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm/)?pixelmatch)',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/bridge/**', // React Native code needs different setup
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
