/**
 * Ships alternate iOS app icons in the asset catalog, for App Store Product
 * Page Optimization tests (appIconName = the key below). No runtime switching.
 *
 *   ["./plugins/withAlternateIcons", { "Bright": "./assets/icon-bright.png" }]
 *
 * The PNG is copied byte for byte (expo-alternate-app-icons re-encodes it as
 * RGBA, and an alpha channel risks ITMS-90717), so keep sources 1024² RGB.
 */
const { withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAlternateIcons(config, icons = {}) {
  const names = Object.keys(icons);
  if (!names.length) return config;

  config = withDangerousMod(config, ['ios', (config) => {
    const root = config.modRequest.projectRoot;
    const xcassets = path.join(root, 'ios', IOSConfig.XcodeUtils.getProjectName(root), 'Images.xcassets');
    for (const name of names) {
      const dir = path.join(xcassets, `${name}.appiconset`);
      const file = `${name}.png`;
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(path.join(root, icons[name]), path.join(dir, file));
      fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({
        images: [{ filename: file, idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'expo', version: 1 },
      }, null, 2));
    }
    return config;
  }]);

  return withXcodeProject(config, (config) => {
    config.modResults.updateBuildProperty('ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES', `"${names.join(' ')}"`);
    config.modResults.updateBuildProperty('ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS', 'YES');
    return config;
  });
};
