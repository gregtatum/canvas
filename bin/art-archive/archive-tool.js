/* eslint-disable no-empty */
// @ts-check
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const { existsSync } = require("fs");
const { exec } = require("child_process");
const jimp = require("jimp");
const mkdirp = require("mkdirp");

/* eslint-disable @typescript-eslint/no-unused-vars */
const black = "\u001b[30m";
const red = "\u001b[31m";
const green = "\u001b[32m";
const yellow = "\u001b[33m";
const blue = "\u001b[34m";
const magenta = "\u001b[35m";
const cyan = "\u001b[36m";
const white = "\u001b[37m";
const reset = "\u001b[0m";
/* eslint-enable @typescript-eslint/no-unused-vars */

const prefix = blue + "[art-archive] " + reset;

module.exports = { archiveTool, prefix };

/** @type {import("./cli").ArchiveConfig[]} */
const configsToProcess = [];
let isProcessing = false;
const isServingArchive = false;
/**
 * @param {import("./cli").ArchiveConfig} config
 */
async function archiveTool(config) {
  if (isProcessing) {
    configsToProcess.push(config);
    return;
  }
  isProcessing = true;
  const {
    archivePath,
    projectPath,
    projectName,
    pieceName,
    projectSlug,
    pieceSlug,
    filePath,
    verbose,
    htmlPath,
    archive,
    serveArchivePort,
  } = config;
  validateSlug(projectSlug);
  validateSlug(pieceSlug);
  if (serveArchivePort && !isServingArchive) {
    console.log(
      prefix +
        "🏃  Starting up art archive server: " +
        cyan +
        "http://localhost:" +
        serveArchivePort +
        reset
    );
    exec(`http-server --port ${serveArchivePort} ${archivePath}`);
  }

  const targetFilesPath = path.join(archivePath, "files");
  /** @type {import("child_process").ExecSyncOptions} */
  const execConfig = {
    cwd: archivePath,
    stdio: "ignore",
  };
  if (verbose) {
    delete execConfig.stdio;
  }

  /**
   * Run a command. It can be configured as verbose. On failure, display the error
   * to stdout.
   *
   * @param {string} cmd
   * @param {import("child_process").ExecSyncOptions} [config]
   * @returns {Promise<string>}
   */
  function run(cmd, config) {
    return new Promise((resolve, reject) => {
      if (verbose) {
        console.log(prefix + "🏃  Running: ", cmd);
      }
      const combinedConfig = {
        ...execConfig,
        ...(config || {}),
      };
      exec(cmd, combinedConfig, (err, stdout, stderr) => {
        if (err) {
          console.error("Command failed to run: " + cmd);
          console.error("stdout:", stdout);
          console.error("stderr:", stderr);
          reject(err);
          return;
        }
        if (verbose) {
          if (stdout) {
            console.log(stdout);
          }
          if (stderr) {
            console.log(stderr);
          }
        }
        resolve(stdout);
      });
    });
  }

  // Validate html archive parameters.
  if (htmlPath) {
    if (archive !== "html") {
      throw new Error(
        "An htmlPath was provied, but the archive type was not html: " + archive
      );
    }
    if (!existsSync(htmlPath)) {
      throw new Error("The provided htmlPath did not exist: " + htmlPath);
    }
  } else {
    if (archive === "html") {
      throw new Error("No htmlPath was provided when archiving HTML.");
    }
  }

  if (!existsSync(projectPath)) {
    throw new Error("The path to this project did not exist: " + projectPath);
  }
  if (!existsSync(filePath)) {
    throw new Error(
      "The path to the file to archive did not exist: " + filePath
    );
  }
  if (!existsSync(archivePath)) {
    throw new Error(
      "The path to the art archive did not exist: " + archivePath
    );
  }
  await run(`rm -rf ${targetFilesPath}`);
  await mkdirp(targetFilesPath);

  console.log(prefix + "🧹  Clean art archive and remove any staged changes.");
  await run(`git clean -fd`);

  await run(`rm -rf ${targetFilesPath}`);
  console.log(prefix + "📄  Copy the project's files to the archive.");
  await run(
    `rsync -av --progress ${projectPath} ${targetFilesPath} --exclude .git --exclude node_modules`
  );

  const date = new Date();
  const isoDate = getIsoString(date);
  const dateTag = getDateSlug(date);
  const commitMessage = `${projectName} – ${pieceName} ${isoDate}`;
  const tag = `${projectSlug}–${pieceSlug}-${dateTag}`;

  console.log(prefix + "💾  Commit the project files.");
  await run("git add . -f");
  await run(`git commit -m ${asBashString("Repo: " + commitMessage)}`);
  await run(`git tag ${tag}`);
  const hash = (await run("git rev-parse HEAD")).trim();

  console.log(prefix + "🏷  Archive tag: " + tag);

  if (htmlPath) {
    console.log(prefix + "🌅  Adding the html.");
    await processHTML({
      serveArchivePort,
      htmlPath,
      archivePath,
      projectSlug,
      pieceSlug,
      dateTag,
      hash,
      sourceImagePath: filePath,
      run,
    });
  } else {
    console.log(prefix + "🌅  Adding the image.");
    await processImage({
      archivePath,
      projectSlug,
      pieceSlug,
      dateTag,
      hash,
      sourceImagePath: filePath,
      run,
    });
  }
  // await run(`rm -rf ${targetFilesPath}`);
  await run("git add . -f");
  await run(`git commit -m ${asBashString("Art: " + commitMessage)}`);
  console.log(prefix + "✨  Done archiving image.");
  if (configsToProcess.length > 0) {
    await archiveTool(configsToProcess.shift());
  }
  isProcessing = false;
}

/**
 * Make a string an acceptable bash string arg.
 */
function asBashString(str) {
  return `"` + str.replace(`"`, `"'"'"`) + `"`;
}

/**
 * Get an ISO string with a time zone.
 * @param {Date} date
 */
function getIsoString(date) {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? "+" : "-";
  function pad(num) {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
  }

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    dif +
    pad(tzo / 60) +
    ":" +
    pad(tzo % 60)
  );
}

/**
 * Get an ISO string with a time zone.
 * @param {Date} date
 */
function getDateSlug(date) {
  function pad(num) {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("-");
}

/**
 * @param {string} slug
 */
function validateSlug(slug) {
  if (!slug.match(/^[a-zA-Z0-9-]+$/)) {
    throw new Error("Slug does not contain the correct form: " + slug);
  }
}

/**
 * @typedef {object} ProcessHTMLOptions
 * @prop {string} archivePath
 * @prop {number} serveArchivePort
 * @prop {string} dateTag
 * @prop {string} htmlPath
 * @prop {string} projectSlug
 * @prop {string} pieceSlug
 * @prop {string} hash
 * @prop {string} sourceImagePath
 * @prop {(s: string) => void} run
 */

/**
 * @param {ProcessHTMLOptions} options
 * @return {Promise<void>}
 */
async function processHTML({
  archivePath,
  serveArchivePort,
  projectSlug,
  pieceSlug,
  dateTag,
  hash,
  htmlPath,
  sourceImagePath,
  run,
}) {
  const folderName = `${pieceSlug}_${dateTag}_${hash}`;
  const archiveProjectPath = path.join(archivePath, projectSlug);
  const targetFolder = path.join(archiveProjectPath, folderName);
  await mkdirp(archiveProjectPath);
  await mkdirp(targetFolder);
  await run(`rsync -av --progress ${path.join(htmlPath, "/")} ${targetFolder}`);

  // Process and save out the imge.
  const image = await jimp.read(sourceImagePath);
  const mediumPath = path.join(targetFolder, "image.jpg");
  const imageWidth = image.bitmap.width;
  const imageHeight = image.bitmap.height;
  const size = 1200;
  let mediumWidth = size;
  let mediumHeight = (imageHeight * size) / imageWidth;
  if (mediumHeight > mediumWidth) {
    mediumHeight = size;
    mediumWidth = (imageHeight * size) / imageWidth;
  }

  await image.resize(mediumWidth, mediumHeight).quality(90).write(mediumPath);

  console.log(prefix + "🌅  saved to: " + targetFolder);
  if (serveArchivePort) {
    const url = `http://localhost:${serveArchivePort}/${path.join(
      projectSlug,
      folderName
    )}`;
    console.log(prefix + "🌅  view at: " + cyan + url + reset);
  }
}

/**
 * @typedef {object} ProcessImageOptions
 * @prop {string} archivePath
 * @prop {string} projectSlug
 * @prop {string} pieceSlug
 * @prop {string} dateTag
 * @prop {string} hash
 * @prop {string} sourceImagePath
 * @prop {(s: string) => void} run
 */

/**
 * @param {ProcessImageOptions} options
 * @returns {Promise<void>}
 */
async function processImage({
  archivePath,
  projectSlug,
  pieceSlug,
  dateTag,
  hash,
  sourceImagePath,
  run,
}) {
  const image = await jimp.read(sourceImagePath);
  const sourceExt = "." + image.getExtension();
  const targetExt = ".jpg";
  const fileName = (ext) => `${pieceSlug}_${dateTag}_${hash}${ext}`;
  const archiveProjectPath = path.join(archivePath, projectSlug);
  const imagePath = path.join(
    archiveProjectPath,
    "originals",
    fileName(sourceExt)
  );
  const thumbPath = path.join(
    archiveProjectPath,
    "thumbs",
    fileName(targetExt)
  );
  const mediumPath = path.join(archiveProjectPath, fileName(targetExt));

  await mkdirp(archiveProjectPath);
  await mkdirp(path.dirname(imagePath));
  await mkdirp(path.dirname(thumbPath));
  await mkdirp(path.dirname(mediumPath));

  const imageWidth = image.bitmap.width;
  const imageHeight = image.bitmap.height;
  const thumbWidth = 450;
  const thumbHeight = 336;
  const mediumWidth = 1500;
  const mediumHeight = (imageHeight * 1500) / imageWidth;

  await run(`cp ${sourceImagePath} ${imagePath}`);

  await (await jimp.read(imagePath))
    .cover(thumbWidth, thumbHeight)
    .quality(90)
    .write(thumbPath);

  await (await jimp.read(imagePath))
    .resize(mediumWidth, mediumHeight)
    .quality(90)
    .write(mediumPath);

  console.log(prefix + "📁  Original to: " + imagePath);
  console.log(prefix + "📁  Medium to: " + mediumPath);
  console.log(prefix + "📁  Thumb to: " + thumbPath);
}
