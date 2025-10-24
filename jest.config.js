module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/Eden_erp/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/e2e/', '/Eden_erp/'],
};
