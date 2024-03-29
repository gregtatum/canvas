#!/usr/bin/env node
// @ts-check
let loadInquirer = import("inquirer");
const {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
  getTemplateParameters,
  getSessionDetails,
} = require("./common");
const path = require("path");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const { startArtArchiveServer } = require("./art-archive/server");
const { runBuild } = require("./build");

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

(async () => {
  const inquirer = (await loadInquirer).default;
  let maybePathToSession = findSessionFromCli();
  if (!maybePathToSession) {
    const sessions = [
      ...getAllSessions("singles"),
      ...getAllSessions("series").reverse(),
    ];

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "fileName",
        message: "Which session do you want to run?",
        choices: sessions.map((session) => session.fileName),
        pageSize: 20,
      },
    ]);

    maybePathToSession =
      sessions.find((session) => session.fileName === answers.fileName)
        ?.pathToSession ?? null;
  }

  if (!maybePathToSession) {
    throw new Error(
      "Could not find a path to the session. This is a programming error."
    );
  }
  const pathToSession = maybePathToSession;

  const sessionSlug = path.basename(pathToSession);
  const sessionDetails = getSessionDetails(sessionSlug);

  console.log(cyan, `\n> npm start ${sessionSlug}`, reset);

  if (!sessionDetails.name) {
    throw new Error("Please add a name to the package.json for this piece.");
  }

  startArtArchiveServer({
    port: 55123,
    projectName: "Canvas",
    projectPath: path.join(__dirname, ".."),
    projectSlug: "canvas",
    pieceName: sessionDetails.name,
    archive: sessionDetails.archive || "image",
    pieceSlug: sessionSlug,
    archivePath: path.join(__dirname, "../../art-archive"),
    runBuild: () => runBuild(pathToSession),
  });

  const template = sessionDetails.template ?? "dev.template.html";

  // TODO - Type this:
  /** @type {any} */
  const config = getWebpackConfig({
    title: sessionSlug,
    entry: path.join(maybePathToSession, "index.ts"),
    isDevelopment: true,
    template,
    templateParameters: getTemplateParameters(template, null, sessionSlug),
    outputPath: path.resolve(__dirname, "../"),
    outputPublicPath: "/",
  });

  // TODO - Type this:
  /** @type {any} */
  const serverConfig = {
    allowedHosts: "all",
    static: [
      {
        directory: config.output.path,
        publicPath: config.output.publicPath,
      }
    ],
    hot: process.env.NODE_ENV === "development" ? true : false,
  };

  const port = 9966;

  /** @type {any} */
  const configuredWebpack = webpack(config);

  new WebpackDevServer(serverConfig, configuredWebpack).listen(
    port,
    "0.0.0.0",
    (err) => {
      if (err) {
        console.log(err);
      }
      const url = `http://localhost:${port}/`;

      const { networkInterfaces } = require("os");
      const nets = networkInterfaces();
      let external = "External IP not found.";
      if (nets.en0) {
        for (const { address } of nets.en0) {
          if (address.match(/^192\./)) {
            external = `http://${address}:${port}`;
          }
        }
      }

      console.log(
        [
          "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          `┃          URL: ${green}${url}${reset}`,
          `┃     High DPI: ${green}${url}?dpi=5${reset}`,
          `┃ Width/Height: ${green}${url}?width=4000&width=4000${reset}`,
          `┃     External: ${green}${external}${reset}`,
          "┃",
          "┃ Happy creative coding!",
          "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      );
    }
  );
})();
