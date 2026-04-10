const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client v4 uses the "exports" field in package.json.
// Metro does not resolve it by default → enable experimental support.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
