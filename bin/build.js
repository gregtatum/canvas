#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const template = require("lodash.template");
const browserify = require("browserify");
const Jimp = require("jimp");

const { findSessionFromCli, getAllSessions } = require("./common");
const babelify = require("babelify");
const exorcist = require("exorcist");

const url = "https://gregtatum.com/category/interactive/";

async function run() {
  // Run the build script.
  const sessions = getAllSessions();
  const sessionSlug = findSessionFromCli();

  if (sessionSlug) {
    await browserifyBundle(sessionSlug);
    await generateThumbnail(sessions, sessionSlug);
  }
  updateReadme(sessions);
  generateAllHtml(sessions);
}

run();

function updateReadme(sessions) {
  const readmeTemplatePath = path.resolve(
    __dirname,
    "../html/README.template.md"
  );
  const readmeDestination = path.resolve(__dirname, "../README.md");
  const readmeTemplate = template(fs.readFileSync(readmeTemplatePath, "utf8"));

  fs.writeFileSync(
    readmeDestination,
    readmeTemplate({
      thumbs: sessions
        .slice()
        .reverse()
        .map(
          ({ fileName }) =>
            `[![Session ${fileName}](./${fileName}/thumb.jpg)](http://sessions-2d.gregtatum.com/${fileName})`
        )
        .join("\n")
    })
  );

  console.log("Updated README at: " + readmeDestination);
}

async function browserifyBundle(sessionSlug) {
  const scriptPath = path.resolve(__dirname, "../", sessionSlug, "index.js");
  const bundlePath = path.resolve(__dirname, "../", sessionSlug, "bundle.js");
  const sourceMapPath = path.resolve(
    __dirname,
    "../",
    sessionSlug,
    "bundle.js.map"
  );

  const stream = require("stream");
  const { promisify } = require("util");
  const streamFinished = promisify(stream.finished);

  console.log(`Start bundling: "${scriptPath}"`);
  await streamFinished(
    browserify(scriptPath, { debug: true })
      .plugin(require("bundle-collapser/plugin"))
      .transform(babelify.configure({ presets: ["@babel/preset-env"] }))
      .transform("uglifyify", { global: true })
      .bundle()
      .pipe(exorcist(sourceMapPath))
      .pipe(fs.createWriteStream(bundlePath, "utf8"))
  );
  console.log(`Bundling finish: "${bundlePath}"`);

  const { size } = fs.statSync(bundlePath);
  console.log(`Bundle size: ${Math.floor(size / 1024)}kb`);
}

function generateAllHtml(sessions) {
  for (const { fileName } of sessions) {
    generateHTML(sessions, fileName);
  }
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

function generateHTML(sessions, sessionSlug) {
  const htmlTemplatePath = path.resolve(
    __dirname,
    "../html/index.template.html"
  );
  const htmlDestination = path.resolve(
    __dirname,
    "../",
    sessionSlug,
    "index.html"
  );
  const packageDestination = path.resolve(
    __dirname,
    "../",
    sessionSlug,
    "package.json"
  );
  const htmlTemplate = template(fs.readFileSync(htmlTemplatePath, "utf8"));

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

  fs.writeFileSync(
    htmlDestination,
    htmlTemplate({
      sessionNumber,
      previous: `<a id="prev" href='${prevLink}'>&lt;</a>`,
      next: `<a id="next" href='${nextLink}'>&gt;</a>`,
      name: packageJson.name
    })
  );

  console.log("Updated HTML file at: " + htmlDestination);
}
