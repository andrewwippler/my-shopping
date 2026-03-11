import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    '*.ts',
    '!*.test.ts',
    '!node_modules/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

export default config;
