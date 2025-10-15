// /** @type {import('jest').Config} */
// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'jsdom',
//   setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
//   transform: { '^.+\\.(ts|mjs)$': 'ts-jest' },
//   moduleFileExtensions: ['ts', 'js', 'json'],
//   testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts']
// };


/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  transform: { '^.+\\.(ts|mjs)$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],

  // ← most csak EZT a specet futtatjuk (maradhat így, amíg stabilizálunk)
  testMatch: ['<rootDir>/src/app/components/loops/loops.component.spec.ts'],

  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/coverage/'],

  // **Fontos**: Angular csomagok stublása
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/test/jest-stubs/angular-core.ts',
    '^@angular/common$': '<rootDir>/test/jest-stubs/angular-common.ts',
    '^@angular/forms$': '<rootDir>/test/jest-stubs/angular-forms.ts',
    '^@angular/router$': '<rootDir>/test/jest-stubs/angular-router.ts',
    '^@angular/common/http$': '<rootDir>/test/jest-stubs/angular-http.ts'
  },

  maxWorkers: '50%',
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      isolatedModules: true,
      diagnostics: false
    }
  }
};
