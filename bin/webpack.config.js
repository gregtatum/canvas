const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Revenant",
      template: "./index.html",
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    path: path.resolve("./public"),
    filename: "[hash].bundle.js",
    chunkFilename: "[id].[hash].bundle.js",
    publicPath: "/",
  },
  mode: "development",
};
