#!/usr/bin/env node
// @ts-check
const path = require("path");
const fs = require("fs");
const template = require("lodash.template");
const webpack = require("webpack");
const Jimp = require("jimp");
const rimraf = require("rimraf");
const { ncp } = require("ncp");
const touch = require("touch");
const { spawn } = require("child_process");
const {
  getPathToSession,
  isSeries,
  getPackageJson,
  getTemplateParameters,
} = require("./common");
const mkdirp = require("mkdirp");

const { getAllSessions, getWebpackConfig } = require("./common");

module.exports = { runBuild };

/**
 * @typedef {import("./common").Session} Session
 * /

/**
 * Run the build script
 * @param {string} sessionPath
 * @returns {Promise<string>} Path to the built session
 */
async function runBuild(sessionPath) {
  /** @type {Session[]} */
  const sessions = getAllSessions();

  copyHtmlFolder();

  // Used for redirects in S3:
  touch(path.join(__dirname, "../dist/index.html"));

  let distPath = path.join(__dirname, "../dist");
  if (sessionPath) {
    const sessionSlug = path.basename(sessionPath);
    removeDistFolder(sessionSlug);
    copySingleFiles(sessionSlug);
    await webpackBundle(sessions, sessionSlug);
    await webpackBundleNeighboringSessions(sessions, sessionSlug);
    await generateThumbnail(sessionSlug);
    copyProjectFiles(sessionSlug);
    buildGregTatumDotCom(sessionSlug);
    reportBundleSize(sessionSlug);
    distPath = path.join(distPath, sessionSlug);
  } else {
    // Build e'rything.
    for (const { fileName: sessionSlug } of sessions) {
      removeDistFolder(sessionSlug);
      await webpackBundle(sessions, sessionSlug);
      await generateThumbnail(sessionSlug);
      copyProjectFiles(sessionSlug);
      buildGregTatumDotCom(sessionSlug);
      reportBundleSize(sessionSlug);
    }
  }
  updateReadme(sessions);
  return distPath;
}

/**
 * @param {string} sessionSlug
 */
function copySingleFiles(sessionSlug) {
  const packageJson = getPackageJson(sessionSlug);
  if (isSeries(sessionSlug)) {
    return;
  }
  const { htmlFiles } = packageJson;
  if (!packageJson.htmlFiles) {
    throw new Error(
      "Expected a single session to have htmlFiles in the package.json"
    );
  }
  console.log("Copying the single files.");
  const distHtmlPath = path.join(__dirname, "../dist", sessionSlug, "html");
  const srcHtmlPath = path.join(__dirname, "../html");
  console.log("Deleting ", distHtmlPath);
  rimraf.sync(distHtmlPath);

  for (const htmlFile of htmlFiles) {
    const dirPath = path.dirname(htmlFile);
    mkdirp.sync(path.join(distHtmlPath, dirPath));
    fs.cpSync(
      path.join(srcHtmlPath, htmlFile),
      path.join(distHtmlPath, htmlFile),
      { force: true }
    );
  }
}

/**
 * @param {string} sessionSlug
 * @returns {Promise<void>}
 */
function buildGregTatumDotCom(sessionSlug) {
  if (!isSeries(sessionSlug)) {
    return Promise.resolve();
  }
  const cwd = path.join(__dirname, "../../greg");
  const command = spawn("npm", ["run", "add-session-2d", sessionSlug], { cwd });

  command.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  command.stderr.on("data", function (data) {
    console.error(data.toString());
  });

  return new Promise((resolve, reject) => {
    command.on("exit", (code) => {
      if (code?.toString() === "0") {
        resolve();
      } else {
        reject(new Error(`Exiting with a non-zero exit code`));
      }
    });
  });
}

/**
 * The neighboring HTML needs to be rebuilt.
 * @param {Session[]} sessions
 * @param {string} sessionSlug
 * @returns {Promise<void>}
 */
async function webpackBundleNeighboringSessions(sessions, sessionSlug) {
  if (!isSeries(sessionSlug)) {
    return;
  }
  const index = sessions.findIndex(
    (session) => session.fileName === sessionSlug
  );
  if (index === -1) {
    throw new Error("Could not find the session.");
  }
  const prevSession = sessions[index - 1];
  const nextSession = sessions[index + 1];
  if (prevSession) {
    console.log("Rebuilding previous session");
    await webpackBundle(sessions, sessionSlug);
  }
  if (nextSession) {
    console.log("Rebuilding next session");
    await webpackBundle(sessions, sessionSlug);
  }
}

function copyProjectFiles(sessionSlug) {
  const fileNames = ["image.jpg", "thumb.jpg"];
  for (const fileName of fileNames) {
    const src = path.join(getPathToSession(sessionSlug), fileName);
    if (!isSeries(sessionSlug)) {
      if (!fs.existsSync(src)) {
        // It's ok for singles to not have an image or thumb.
        continue;
      }
    }
    const dest = path.join(__dirname, "../dist", sessionSlug, fileName);
    console.log(`Copying "${src}"`);
    fs.copyFileSync(src, dest);
  }
}

/**
 * @returns {Promise<void>}
 */
function copyHtmlFolder() {
  const source = path.resolve(__dirname, "../html");
  const destination = path.resolve(__dirname, "../dist/html");
  rimraf.sync(destination);
  console.log("Copying ./html folder to dist.");
  return new Promise((resolve, reject) => {
    ncp(source, destination, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function removeDistFolder(sessionSlug) {
  const distPath = path.resolve(__dirname, "../dist", sessionSlug);
  console.log(`Removing the session's dist folder first "${distPath}"`);
  rimraf.sync(path.resolve(__dirname, "../dist", sessionSlug));
}

function updateReadme(sessions) {
  const readmeTemplatePath = path.resolve(
    __dirname,
    "../html/README.template.md"
  );
  const readmeDestination = path.resolve(__dirname, "../README.md");
  const readmeDistDestination = path.resolve(__dirname, "../dist/README.md");
  const readmeTemplate = template(fs.readFileSync(readmeTemplatePath, "utf8"));

  fs.writeFileSync(
    readmeDestination,
    readmeTemplate({
      thumbs: sessions
        .slice()
        .reverse()
        .map(
          ({ fileName }) =>
            `[![Session ${fileName}](./${fileName}/thumb.jpg)](https://gregtatum.com/canvas/${fileName})`
        )
        .join("\n"),
    })
  );

  fs.copyFileSync(readmeDestination, readmeDistDestination);

  console.log("Updated README at: " + readmeDestination);
  console.log("Updated README at: " + readmeDistDestination);
}

function getSessionTitle(sessionSlug) {
  const { name } = getPackageJson(sessionSlug);
  if (!name) {
    throw new Error("No name was found in the session's package.json.");
  }
  return name;
}

async function webpackBundle(sessions, sessionSlug) {
  const sessionPath = getPathToSession(sessionSlug);
  const entry = path.resolve(sessionPath, "index.ts");
  const template = isSeries(sessionSlug)
    ? "series.template.html"
    : "single.template.html";
  /** @type {any} */
  const config = getWebpackConfig({
    title: getSessionTitle(sessionSlug),
    entry,
    isDevelopment: false,
    template,
    templateParameters: getTemplateParameters(template, sessions, sessionSlug),
    outputPath: path.resolve(__dirname, "../dist", sessionSlug),
    outputPublicPath: isSeries(sessionSlug) ? "../" + sessionSlug : undefined,
  });

  console.log(`Start bundling: "${entry}"`);
  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      webpack(config, (error, stats) => {
        console.log(
          stats.toString({
            // Add console colors
            colors: true,
          })
        );
        if (error) {
          reject(error);
        }
        resolve();
      });
    })
  );
}

function reportBundleSize(sessionSlug) {
  const bundlePath = getBundlePath(sessionSlug);
  console.log(`Bundling finish "${bundlePath}"`);

  const { size } = fs.statSync(bundlePath);
  console.log(`Bundle size: ${Math.floor(size / 1024)}kb`);
}

function getBundlePath(sessionSlug) {
  const dir = path.join(__dirname, "../dist/", sessionSlug);

  // Go through the root directory and get all of the projects
  // that start with numbers.
  for (const fileName of fs.readdirSync(dir)) {
    // Does the filename start with numbers?
    if (fileName.match(/\.bundle\.js$/)) {
      return path.join(dir, fileName);
    }
  }
  throw new Error("Unable to find the bundle path.");
}

/**
 * @param {string} sessionSlug
 */
async function generateThumbnail(sessionSlug) {
  const sessionPath = getPathToSession(sessionSlug);
  const fullImagePath = path.resolve(sessionPath, "image.jpg");
  const thumbPath = path.resolve(sessionPath, "thumb.jpg");
  // Fit this nicely into GitHub's README.md display width.
  const width = 292;
  const height = 164;

  try {
    fs.statSync(fullImagePath);
  } catch (error) {
    console.error(
      "Full image did not exist, no thumbnail was generated",
      fullImagePath
    );
    return;
  }

  console.log("Reading the screenshot");
  const screenshot = await Jimp.read(fullImagePath);

  console.log(`Resizing the screenshot to the thumb size ${width}x${height}`);
  await screenshot.resize(width, height).write(thumbPath);
  console.log(`Thumb outputed at: ${thumbPath}`);
}
