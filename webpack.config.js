const path = require("path");
 
module.exports = {
  mode: "production",
  target: "node",
  entry: "./src/index.js", // غيّرها لملف البداية عندك
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  externalsPresets: { node: true },
  optimization: {
    minimize: true,
  },
};