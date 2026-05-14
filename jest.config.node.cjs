/** Minimal jest config for pure computation tests (no DOM dependencies) */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.{ts,js}'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        module: 'commonjs',
        moduleResolution: 'node',
        target: 'es2020',
        strict: false,
        skipLibCheck: true,
      },
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // No setupFilesAfterEnv — avoids DOM-dependent setup
};
