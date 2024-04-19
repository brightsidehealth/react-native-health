const { withAppDelegate, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins')
const {
  mergeContents
} = require('@expo/config-plugins/build/utils/generateCode')

const RN_HEALTH_IMPORT = '#import "RCTAppleHealthKit.h"'
const RN_HEALTH_BRIDGE = '  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];'
const RN_HEALTH_INITIALIZE = '  [[RCTAppleHealthKit new] initializeBackgroundObservers:bridge];'

const HEALTH_SHARE = 'Allow $(PRODUCT_NAME) to check health info'
const HEALTH_UPDATE = 'Allow $(PRODUCT_NAME) to update health info'
const HEALTH_CLINIC_SHARE = 'Allow $(PRODUCT_NAME) to check health clinical info'

function addImport(src) {
  const newSrc = [RN_HEALTH_IMPORT]
  return mergeContents({
    tag: 'healthkit-import',
    src,
    newSrc: newSrc.join('\n'),
    anchor: /#import "AppDelegate\.h"/,
    offset: 1,
    comment: '//'
  })
}

function addInit(src) {
  const newSrc = [RN_HEALTH_BRIDGE, RN_HEALTH_INITIALIZE]
  return mergeContents({
    tag: 'healthkit-init',
    src,
    newSrc: newSrc.join('\n'),
    anchor: /self.initialProps = @{};/,
    offset: 1,
    comment: '  //'
  })
}


const withHealthKit = (
  config,
  { healthSharePermission, healthUpdatePermission, isClinicalDataEnabled, healthClinicalDescription, isBackgroundDeliveryEnabled } = {},
) => {
  // Add import
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language === 'objcpp') {
      config.modResults.contents = addImport(config.modResults.contents).contents
      config.modResults.contents = addInit(config.modResults.contents).contents
    }
    return config
  })

  // Add permissions
  config = withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      healthSharePermission ||
      config.modResults.NSHealthShareUsageDescription ||
      HEALTH_SHARE
    config.modResults.NSHealthUpdateUsageDescription =
      healthUpdatePermission ||
      config.modResults.NSHealthUpdateUsageDescription ||
      HEALTH_UPDATE
    isClinicalDataEnabled ?
      config.modResults.NSHealthClinicalHealthRecordsShareUsageDescription =
        healthClinicalDescription ||
        config.modResults.NSHealthClinicalHealthRecordsShareUsageDescription ||
        HEALTH_CLINIC_SHARE :
      null

    return config
  })

  // Add entitlements. These are automatically synced when using EAS build for production apps.
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true
    if (isBackgroundDeliveryEnabled) {
      config.modResults['com.apple.developer.healthkit.background-delivery'] = true
    }
    if (
      !Array.isArray(config.modResults['com.apple.developer.healthkit.access'])
    ) {
      config.modResults['com.apple.developer.healthkit.access'] = []
    }

    if (isClinicalDataEnabled) {
      config.modResults['com.apple.developer.healthkit.access'].push(
        'health-records',
      )

      // Remove duplicates
      config.modResults['com.apple.developer.healthkit.access'] = [
        ...new Set(config.modResults['com.apple.developer.healthkit.access']),
      ]
    }

    return config
  })

  return config
}
module.exports = withHealthKit
