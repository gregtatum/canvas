// @ts-check
const path = require("path");
const fs = require("fs");
const removeMarkdown = require("remove-markdown");

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

/**
 * @return {Array<{ fileName: string, pathToSession: string }>}
 */
function getAllSessions(type = "series") {
  const dir = path.join(__dirname, "../src/", type);
  const sessions = [];

  // Go through the root directory and get all of the projects
  // that start with numbers.
  for (const fileName of fs.readdirSync(dir)) {
    const pathToSession = path.join(dir, fileName);
    if (fs.statSync(pathToSession).isDirectory()) {
      // Does the filename start with numbers?
      if (type === "singles" || fileName.match(/^\d+/)) {
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
      filename: "[contenthash].bundle.js",
      chunkFilename: "[id].[contenthash].bundle.js",
    },
    mode: isDevelopment ? "development" : "production",
  };
}

const url = "https://gregtatum.com/category/interactive/";

/**
 * @typedef {object} Session;
 * @prop {string} fileName
 * @prop {string} pathToSession
 */

/**
 * @param {string} template
 * @param {Session[] | null} sessions
 * @param {string} slug
 */
function getTemplateParameters(template, sessions, slug) {
  let prevSession;
  let nextSession;
  if (sessions) {
    const projectIndex = sessions.findIndex(
      (session) => session.fileName === slug
    );
    prevSession = sessions[projectIndex - 1];
    nextSession = sessions[projectIndex + 1];
  }
  const packageJson = getPackageJson(slug);

  let sessionNumber = null;
  const sessionNumberResult = slug.match(/\d\d\d/);
  if (sessionNumberResult) {
    sessionNumber = sessionNumberResult[0];
  }
  let prevLink = prevSession ? `../${prevSession.fileName}` : url;
  let nextLink = nextSession ? `../${nextSession.fileName}` : url;

  if (packageJson.next) {
    nextLink = packageJson.next;
  }
  if (packageJson.prev) {
    prevLink = packageJson.prev;
  }

  let previous = `<a id="prev" href='${prevLink}'>←</a>`;
  let next = `<a id="next" href='${nextLink}'>→</a>`;
  if (template === "frame.template.html") {
    previous = `<a id="prev" href='${prevLink}'><img src="../html/arrow-left.svg" alt="Back" /></a>`;
    next = `<a id="next" href='${nextLink}'><img src="../html/arrow-right.svg" alt="Next" /></a>`;
  }

  return {
    sessionNumber,
    previous,
    next,
    slug,
    name: packageJson.name,
    description: getSessionReadmeDescription(slug),
  };
}

/**
 * @param {string} sessionSlug
 * @returns {string}
 */
function getSessionReadmeDescription(sessionSlug) {
  const sessionPath = getPathToSession(sessionSlug);
  const markdown = fs.readFileSync(path.join(sessionPath, "README.md"), "utf8");
  if (!markdown) {
    throw new Error("No README.md was written for the session.");
  }
  const text = removeMarkdown(markdown);
  return text.split("\n")[0];
}

/**
 * @param {string} sessionSlug
 */
function isSeries(sessionSlug) {
  return Boolean(sessionSlug.match(/\d\d\d/));
}

/**
 * @param {string} sessionSlug
 */
function getPackageJson(sessionSlug) {
  const packageDestination = path.resolve(
    getPathToSession(sessionSlug),
    "package.json"
  );
  // Don't use require, as it caches the result.
  return JSON.parse(fs.readFileSync(packageDestination, { encoding: "utf8" }));
}

/**
 * @param {string} sessionSlug
 * @returns {Record<string, string>}
 */
function getSessionDetails(sessionSlug) {
  try {
    return require(path.join(getPathToSession(sessionSlug), "package.json"));
  } catch (error) {
    return {};
  }
}

module.exports = {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
  getPathToSession,
  getTemplateParameters,
  isSeries,
  getPackageJson,
  getSessionDetails,
};
