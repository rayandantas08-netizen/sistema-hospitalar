/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    setupFiles: ['<rootDir>/tests/setup-env.ts'],
    clearMocks: true,
    transform: {
        '^.+\\.ts$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}],
    },
};
