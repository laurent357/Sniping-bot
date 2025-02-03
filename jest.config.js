module.exports = {
    transform: {
      '^.+\\.tsx?$': 'ts-jest', // For TypeScript files
      '^.+\\.jsx?$': 'babel-jest', // For JavaScript files
    },
    transformIgnorePatterns: [
      "/node_modules/(?!axios)" // Allow transformation of axios
    ],
    moduleNameMapper: {
      // Add any necessary mappings for non-JS modules here
    },
    testEnvironment: "node", // or "jsdom" depending on your setup
  };