#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const template = require("lodash.template");
const webpack = require("webpack");
const Jimp = require("jimp");
const rimraf = require("rimraf");
const { ncp } = require("ncp");
const touch = require("touch");
const removeMarkdown = require("remove-markdown");
const { spawn } = require("child_process");

const {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
} = require("./common");

const url = "https://gregtatum.com/category/interactive/";

run();

async function run() {
  if (!process.argv[2]) {
    console.log("Usage:");
    console.log("Re-build everything: yarn build main");
    console.log("Re-build a single session: yarn build 001-tick-tock");
    process.exit(0);
  }

  // Run the build script.
  const sessions = getAllSessions();
  const sessionPath = findSessionFromCli();

  copyHtmlFolder();

  // Used for redirects in S3:
  touch(path.join(__dirname, "../dist/index.html"));

  if (sessionPath) {
    const sessionSlug = path.basename(sessionPath);
    removeDistFolder(sessionSlug);
    await webpackBundle(sessions, sessionSlug);
    await webpackBundleNeighboringSessions(sessions, sessionSlug);
    await generateThumbnail(sessions, sessionSlug);
    copyProjectFiles(sessionSlug);
    buildGregTatumDotCom(sessionSlug);
    reportBundleSize(sessionSlug);
  } else {
    // Build e'rything.
    for (const { fileName: sessionSlug } of sessions) {
      removeDistFolder(sessionSlug);
      await webpackBundle(sessions, sessionSlug);
      await generateThumbnail(sessions, sessionSlug);
      copyProjectFiles(sessionSlug);
      buildGregTatumDotCom(sessionSlug);
      reportBundleSize(sessionSlug);
    }
  }
  updateReadme(sessions);
}

function buildGregTatumDotCom(sessionSlug) {
  const cwd = path.join(__dirname, "../../greg");
  const command = spawn("npm", ["run", "add-session-2d", sessionSlug], { cwd });

  command.stdout.on("data", function(data) {
    console.log(data.toString());
  });

  command.stderr.on("data", function(data) {
    console.error(data.toString());
  });

  return new Promise((resolve, reject) => {
    command.on("exit", code => {
      if (code.toString() === "0") {
        resolve();
      } else {
        reject(new Error(`Exiting with a non-zero exit code`));
      }
    });
  });
}

/**
 * The neighboring HTML needs to be rebuilt.
 */
async function webpackBundleNeighboringSessions(sessions, sessionSlug) {
  const index = sessions.findIndex(session => session.fileName === sessionSlug);
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
    const src = path.join(__dirname, "../", sessionSlug, fileName);
    const dest = path.join(__dirname, "../dist", sessionSlug, fileName);
    console.log(`Copying "${src}"`);
    fs.copyFileSync(src, dest);
  }
}

function copyHtmlFolder() {
  const source = path.resolve(__dirname, "../html");
  const destination = path.resolve(__dirname, "../dist/html");
  rimraf.sync(destination);
  console.log("Copying ./html folder to dist.");
  return new Promise((resolve, reject) => {
    ncp(source, destination, function(err) {
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
  console.log(`Removing the dist folder first "${distPath}"`);
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
  const packageDestination = path.resolve(
    __dirname,
    "../",
    sessionSlug,
    "package.json"
  );
  const packageJson = require(packageDestination);
  packageJson.name;
}

function getSessionReadmeDescription(sessionSlug) {
  const sessionPath = path.join(__dirname, "..", sessionSlug);
  const markdown = fs.readFileSync(path.join(sessionPath, "README.md"), "utf8");
  if (!markdown) {
    throw new Error("No REAMDE.md was written for the session.");
  }
  const text = removeMarkdown(markdown);
  return text.split("\n")[0];
}

async function webpackBundle(sessions, sessionSlug) {
  const sessionPath = path.join(__dirname, "..", sessionSlug);
  const entry = path.resolve(sessionPath, "index.ts");
  const config = getWebpackConfig({
    title: getSessionTitle(sessionPath),
    entry,
    isDevelopment: false,
    template: "index.template.html",
    templateParameters: getTemplateParameters(sessions, sessionSlug),
    outputPath: path.resolve(__dirname, "../dist", sessionSlug),
    outputPublicPath: "../" + sessionSlug,
  });

  console.log(`Start bundling: "${entry}"`);
  await new Promise((resolve, reject) => {
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
  });
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

async function generateThumbnail(sessions, sessionSlug) {
  const sessionPath = path.resolve(__dirname, "../", sessionSlug);
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
  }

  console.log("Reading the screenshot");
  const screenshot = await Jimp.read(fullImagePath);

  console.log(`Resizing the screenshot to the thumb size ${width}x${height}`);
  await screenshot.resize(width, height).write(thumbPath);
  console.log(`Thumb outputed at: ${thumbPath}`);
}

function getTemplateParameters(sessions, sessionSlug) {
  const packageDestination = path.resolve(
    __dirname,
    "../",
    sessionSlug,
    "package.json"
  );

  const projectIndex = sessions.findIndex(
    session => session.fileName === sessionSlug
  );
  const previous = sessions[projectIndex - 1];
  const next = sessions[projectIndex + 1];
  const packageJson = require(packageDestination);
  const sessionNumberResult = sessionSlug.match(/\d\d\d/);
  if (!sessionNumberResult) {
    throw new Error("Could not find a session number for the session slug");
  }
  const [sessionNumber] = sessionNumberResult;
  if (!sessionNumber) {
    throw new Error("Could not find a session number.");
  }
  const prevLink = previous ? `../${previous.fileName}` : url;
  const nextLink = next ? `../${next.fileName}` : url;

  return {
    sessionNumber,
    previous: `<a id="prev" href='${prevLink}'>⬅</a>`,
    next: `<a id="next" href='${nextLink}'>➡</a>`,
    name: packageJson.name,
    description: getSessionReadmeDescription(sessionSlug),
  };
}
