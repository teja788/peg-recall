/**
 * Color Catch only schedules LOCAL notifications (the daily reminder), which
 * need no push capability. expo-notifications' plugin is applied automatically
 * once the package is installed and adds `aps-environment`, which would make
 * EAS turn on Push Notifications for the App ID. Take it back out.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
