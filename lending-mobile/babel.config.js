module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Must be last — required for production bundles (EAS) and Reanimated
    plugins: ["react-native-reanimated/plugin"],
  };
};
