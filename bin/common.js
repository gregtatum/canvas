// @ts-check
const path = require("path");
const fs = require("fs");

/**
 * @param {string} slug
 * @returns {string}
 */
function getPathToSession(slug) {
  return slug.match(/^\d+/)
    ? path.join(__dirname, "../src/series", slug)
    : path.join(__dirname, "../src/singles", slug);
}

function findSessionFromCli() {
  const session = process.argv[2];
  if (!session || session === "all") {
    return null;
  }
  // Don't trust this path too much.
  const { name } = path.parse(session);

  const pathToSession = getPathToSession(name);
  try {
    if (fs.statSync(pathToSession).isDirectory()) {
      return pathToSession;
    }
  } catch (error) {
    // Ignore the error.
  }

  console.error(`Could not find the session "${session}".`);
  console.error(`Looked in: ${pathToSession}`);
  process.exit();

  // Needed for eslint
  return null;
}

function getAllSessions() {
  const dir = path.join(__dirname, "../src/series");
  const sessions = [];

  // Go through the root directory and get all of the projects
  // that start with numbers.
  for (const fileName of fs.readdirSync(dir)) {
    const pathToSession = path.join(dir, fileName);
    if (fs.statSync(pathToSession).isDirectory()) {
      // Does the filename start with numbers?
      if (fileName.match(/^\d+/)) {
        sessions.push({ fileName, pathToSession });
      }
    }
  }

  // Sort the projects alphabetically.
  sessions.sort((a, b) => a.fileName.localeCompare(b.fileName));

  return sessions;
}

function getWebpackConfig({
  title,
  entry,
  isDevelopment,
  template,
  templateParameters,
  outputPath,
  outputPublicPath,
}) {
  const HtmlWebpackPlugin = require("html-webpack-plugin");
  console.log(templateParameters);

  return {
    entry,
    devtool: isDevelopment ? "inline-source-map" : "source-map",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          exclude: /node_modules/,
          options: {
            // disable type checker - we will use it in fork plugin
            transpileOnly: true,
          },
        },
        {
          test: /\.css$/i,
          use: ["css-loader"],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        title,
        template: path.resolve(__dirname, "../html/", template),
        templateParameters,
        minify: false,
        inject: false,
      }),
    ],
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        // Also see .babelrc, and tsconfig to update.
        lib: path.resolve(__dirname, "../src/lib"),
      },
    },
    output: {
      path: outputPath,
      publicPath: outputPublicPath,
      filename: "[hash].bundle.js",
      chunkFilename: "[id].[hash].bundle.js",
    },
    mode: isDevelopment ? "development" : "production",
  };
}

module.exports = {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
  getPathToSession,
};
