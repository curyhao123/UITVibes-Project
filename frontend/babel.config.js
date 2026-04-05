// babel.config.js — Reanimated v4 requires react-native-worklets/plugin
// For Expo SDK 54 with React Compiler (experiments.reactCompiler: true):
// Order matters: react-native-worklets/plugin must come before react-compiler
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',
    ],
  };
};
