module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  collectCoverageFrom: ['public/**/*.js'],
  coverageDirectory: 'coverage',
  transform: {},
  // Si besoin de transformer des modules ES6
  // transform: {
  //   '^.+\.js$': 'babel-jest',
  // },
  moduleFileExtensions: ['js', 'json'],
  moduleDirectories: ['node_modules'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true
};
