/**
 * Xcode 27 rejects pods whose deployment target is below iOS 15 (SDWebImage
 * 9.0, ReachabilitySwift 12.0, RNSVGFilters 12.4 were warnings before). Lift
 * every pod target to at least the app's own minimum.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK = '# withPodsDeploymentTarget';

module.exports = function withPodsDeploymentTarget(config, min = '15.1') {
  return withDangerousMod(config, ['ios', (config) => {
    const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    let podfile = fs.readFileSync(file, 'utf8');
    if (!podfile.includes(MARK)) {
      podfile = podfile.replace(/post_install do \|installer\|\n/, (m) => `${m}    ${MARK}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${min}
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${min}'
        end
      end
    end
`);
      if (!podfile.includes(MARK)) throw new Error('withPodsDeploymentTarget: post_install block not found in Podfile');
      fs.writeFileSync(file, podfile);
    }
    return config;
  }]);
};
