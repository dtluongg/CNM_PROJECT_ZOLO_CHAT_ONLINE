const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withExcludeJitsiWebrtc(config) {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    const exclusion = `
configurations.all {
    exclude group: 'org.jitsi', module: 'webrtc'
}
`;
    if (!contents.includes("exclude group: 'org.jitsi'")) {
      mod.modResults.contents = contents.replace(
        /^android\s*\{/m,
        exclusion + '\nandroid {'
      );
    }
    return mod;
  });
};