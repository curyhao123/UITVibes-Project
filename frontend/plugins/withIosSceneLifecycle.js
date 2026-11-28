const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

const legacyReactNativeStartup = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    };

    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error("The iOS scene lifecycle plugin requires a Swift AppDelegate.");
    }

    let contents = config.modResults.contents;

    if (
      contents.includes("ExpoReactNativeFactoryProvider") &&
      !contents.includes("factory.startReactNative(")
    ) {
      return config;
    }

    const appDelegateDeclaration = "class AppDelegate: ExpoAppDelegate {";
    if (!contents.includes(appDelegateDeclaration)) {
      throw new Error("Could not find the expected Expo AppDelegate declaration.");
    }
    if (!contents.includes(legacyReactNativeStartup)) {
      throw new Error("Could not find the expected legacy React Native startup block.");
    }

    contents = contents.replace(
      appDelegateDeclaration,
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
    );
    contents = contents.replace(legacyReactNativeStartup, "");
    config.modResults.contents = contents;

    return config;
  });

  return config;
}

module.exports = withIosSceneLifecycle;
