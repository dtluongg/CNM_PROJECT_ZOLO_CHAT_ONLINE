const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Redirect react-native-webrtc → @livekit/react-native-webrtc
// Both share the same Java package (com.oney.WebRTCModule) and cannot coexist on Android.
// @livekit/react-native-webrtc is a superset fork with identical API.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-webrtc': require.resolve('@livekit/react-native-webrtc'),
};

module.exports = config;