/* eslint-disable no-empty */
// @ts-check
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const { existsSync, mkdirSync } = require("fs");
const { exec, execSync } = require("child_process");
const jimp = require("jimp");

module.exports = { archiveTool };

/**
 * @param {import("./cli").ArchiveConfig} config
 */
async function archiveTool(config) {
  const {
    archivePath,
    projectPath,
    projectName,
    pieceName,
    projectSlug,
    pieceSlug,
    filePath,
    verbose,
  } = config;
  validateSlug(projectSlug);
  validateSlug(pieceSlug);

  const filesPath = path.join(archivePath, "files");
  /** @type {import("child_process").ExecSyncOptions} */
  const execConfig = {
    cwd: archivePath,
    stdio: "ignore",
  };

  /**
   * Run a command. It can be configured as verbose. On failure, display the error
   * to stdout.
   *
   * @param {string} cmd
   * @param {import("child_process").ExecSyncOptions} [config]
   * @returns {void}
   */
  function run(cmd, config) {
    const { execSync } = require("child_process");
    try {
      if (verbose) {
        console.log("Running: ", cmd);
      }
      const combinedConfig = {
        ...execConfig,
        ...(config || {}),
      };
      const buffer = execSync(cmd, combinedConfig);
      if (verbose) {
        console.log(buffer.toString());
      }
    } catch (error) {
      // Output the child process stdout.
      if (error.output) {
        const [, stdout, stderr] = error.output;
        console.error(stdout.toString());
        console.error(stderr.toString());
      }
      throw new Error("Command failed to run: " + cmd);
    }
  }

  if (!existsSync(projectPath)) {
    throw new Error("The path to this project did not exist: " + projectPath);
  }
  if (!existsSync(archivePath)) {
    throw new Error(
      "The path to the art archive did not exist: " + archivePath
    );
  }

  console.log(" 🧹  Clean art archive and remove any staged changes.");
  run(`git clean -fd`);

  console.log(" 🌳  Switch and detach to the root tag.");
  run(`git switch --detach root`);

  console.log(" 📄  Copy the project's files to the archive.");
  run(
    `rsync -av --progress ${projectPath}/ ${filesPath} --exclude .git --exclude node_modules`
  );

  const isoDate = getIsoString();
  const commitMessage = `${projectName} – ${pieceName} ${isoDate}`;
  const tag = taggify(`${projectSlug}–${pieceSlug}-${isoDate}`);

  console.log(" 💾  Commit the project files.");
  run("git add .");
  run(`git commit -m ${asBashString(commitMessage)}`);
  run(`git tag ${tag}`);
  const hash = (await ask("git rev-parse HEAD")).trim();

  console.log(" 👈  Restoring to root.");
  run("git switch main");
  run("git clean -fd");

  console.log(" 🌅  Adding the image.");
  processImage({
    archivePath,
    projectSlug,
    pieceSlug,
    isoDate,
    hash,
    sourceImagePath: filePath,
  });
  run(`git commit -m ${asBashString(commitMessage)}`);
}

/**
 * Make a string into an acceptable tag.
 */
function taggify(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2") // get all lowercase letters that are near to uppercase ones
    .replace(/[\s_]+/g, "-") // replace all spaces and low dash
    .replace(/[:]+/g, "_") // : are not allowed in tags
    .toLowerCase(); // convert to lower case
}

/**
 * Make a string an acceptable bash string arg.
 */
function asBashString(str) {
  return `"` + str.replace(`"`, `"'"'"`) + `"`;
}

/**
 * Get an ISO string with a time zone.
 */
function getIsoString() {
  const date = new Date();
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
 * @param {string} slug
 */
function validateSlug(slug) {
  if (!slug.match(/^[a-zA-Z0-9-]+$/)) {
    throw new Error("Slug does not contain the correct form: " + slug);
  }
}

/**
 * @prop {string} archivePath
 * @prop {string} projectSlug
 * @prop {string} pieceSlug
 * @prop {string} isoDate
 * @prop {string} hash
 * @prop {string} sourceImagePath
 */
async function processImage({
  archivePath,
  projectSlug,
  pieceSlug,
  isoDate,
  hash,
  sourceImagePath,
}) {
  const ext = ".jpg";
  const fileName = `${pieceSlug}-${taggify(isoDate)}-${hash}${ext}`;
  const archiveProjectPath = path.join(archivePath, projectSlug);
  const imagePath = path.join(archiveProjectPath, "originals", fileName);
  const thumbPath = path.join(archiveProjectPath, "thumbs", fileName);
  const mediumPath = path.join(archiveProjectPath, fileName);

  function mkdirp(p) {
    try {
      mkdirSync(path.dirname(p));
    } catch (e) {
      // Error if it exists.
    }
  }
  mkdirp(archiveProjectPath);
  mkdirp(path.dirname(imagePath));
  mkdirp(path.dirname(thumbPath));
  mkdirp(path.dirname(mediumPath));

  const image = await jimp.read(sourceImagePath);
  const imageWidth = image.bitmap.width;
  const imageHeight = image.bitmap.height;
  const thumbWidth = 450;
  const thumbHeight = 336;
  const mediumWidth = 1500;
  const mediumHeight = (imageHeight * 1500) / imageWidth;

  execSync(`cp ${sourceImagePath} ${imagePath}`);

  await (await jimp.read(imagePath))
    .cover(thumbWidth, thumbHeight)
    .quality(90)
    .write(thumbPath);

  await (await jimp.read(imagePath))
    .resize(mediumWidth, mediumHeight)
    .quality(90)
    .write(mediumPath);
}

/**
 * Run a shell command and get the response.
 * @param {string} command
 */
function ask(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        return reject(err);
      }
      resolve(stdout);
    });
  });
}
