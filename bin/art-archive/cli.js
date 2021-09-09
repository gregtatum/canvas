#!/usr/bin/env node
// @ts-check
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const yargs = require("yargs/yargs");
const { archiveTool } = require("./archive-tool");

/**
 * @typedef {Object} ArchiveConfig
 * @prop {string} archivePath
 * @prop {string} projectPath
 * @prop {string} projectName
 * @prop {string} [projectSlug]
 * @prop {string} pieceName
 * @prop {string} [pieceSlug]
 * @prop {string} filePath
 * @prop {string} [htmlPath]
 * @prop {string} [archive]
 * @prop {number} [serveArchivePort]
 * @prop {unknown} [verbose]
 */

/**
 * @type {ArchiveConfig}
 */
const args = yargs(process.argv.slice(2))
  .usage("A service to archive the current art project")
  .options({
    archivePath: {
      description: "The path to the art archive repo",
      default: "/Users/greg/me/art-archive",
    },
    projectPath: {
      description: "The path to this project",
      default: path.join(__dirname, ".."),
    },
    projectName: {
      description: "The name of the project",
      default: "Untitled",
    },
    projectSlug: {
      description: "A slugified version of the project name",
      type: "string",
      array: false,
    },
    pieceName: {
      description: "The title of the current piece",
      default: "Untitled",
    },
    pieceSlug: {
      description: "A slugified version of the project name",
      type: "string",
      array: false,
    },
    filePath: {
      description: "The path to the file to archive",
      type: "string",
      array: false,
    },
    htmlPath: {
      description: "The path to the HTML to archive",
      type: "string",
      array: false,
    },
    archive: {
      description: 'The archive type, either "png" or "html"',
      choices: ["png", "html"],
      default: "png",
      array: false,
    },
    serveArchivePort: {
      description: "Optionally serve up the art archive at the given port",
      type: "number",
    },
    verbose: {
      description: "Display the verbose output of the underlying commands",
    },
  })
  .parse();

archiveTool(args);
