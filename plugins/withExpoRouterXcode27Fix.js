/**
 * expo-router 55.0.18 sets UIAction.subtitle (iOS 16+) without an availability
 * check; Xcode 27 makes that an error while the app still targets iOS 15.1.
 * Guard it at prebuild (node_modules is fresh on EAS). Drop this plugin once
 * expo-router ships the fix.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BAD = `    if let subtitle = subtitle {
      baseUiAction.subtitle = subtitle
    }`;
const GOOD = `    if #available(iOS 16.0, *), let subtitle = subtitle {
      baseUiAction.subtitle = subtitle
    }`;

module.exports = function withExpoRouterXcode27Fix(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const file = path.join(path.dirname(require.resolve('expo-router/package.json')), 'ios/LinkPreview/LinkPreviewNativeActionView.swift');
    const src = fs.readFileSync(file, 'utf8');
    if (src.includes(BAD)) fs.writeFileSync(file, src.replace(BAD, GOOD));
    else if (!src.includes(GOOD)) console.warn('withExpoRouterXcode27Fix: pattern not found; expo-router changed, check the Xcode 27 build');
    return config;
  }]);
};
