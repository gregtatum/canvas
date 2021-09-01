#!/usr/bin/env node
// @ts-check
const inquirer = require("inquirer");
const {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
} = require("./common");
const path = require("path");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const { startServer } = require("./art-archive/server");

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
  let pathToSession = findSessionFromCli();
  if (!pathToSession) {
    const sessions = getAllSessions();

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "fileName",
        message: "Which session do you want to run?",
        choices: sessions.map(session => session.fileName).reverse(),
      },
    ]);

    pathToSession = sessions.find(
      session => session.fileName === answers.fileName
    ).pathToSession;
  }

  if (!pathToSession) {
    throw new Error(
      "Could not find a path to the session. This is a programming error."
    );
  }

  const sessionSlug = path.basename(pathToSession);

  let sessionDetails = {};
  try {
    sessionDetails = require(path.join(pathToSession, "package.json"));
  } catch (error) {
    //
  }

  startServer({
    port: 55123,
    projectName: "Canvas",
    projectPath: path.join(__dirname, ".."),
    projectSlug: "canvas",
    pieceName: sessionDetails.name || "Untitled",
    pieceSlug: sessionSlug,
    archivePath: path.join(__dirname, "../../art-archive"),
  });

  // TODO - Type this:
  /** @type {any} */
  const config = getWebpackConfig({
    title: sessionSlug,
    entry: path.join(pathToSession, "index.ts"),
    isDevelopment: true,
    template: "dev.template.html",
    templateParameters: {},
    outputPath: path.resolve(__dirname, "../"),
    outputPublicPath: "/",
  });

  /** @type {import("webpack-dev-server").Configuration} */
  const serverConfig = {
    disableHostCheck: true,
    contentBase: config.output.path,
    publicPath: config.output.publicPath,
    noInfo: true,
    hot: process.env.NODE_ENV === "development" ? true : false,
    stats: { colors: true },
  };

  const port = 9966;

  /** @type {any} */
  const configuredWebpack = webpack(config);

  new WebpackDevServer(configuredWebpack, serverConfig).listen(
    port,
    "localhost",
    err => {
      if (err) {
        console.log(err);
      }
      const url = `http://localhost:${port}/`;

      console.log(
        [
          "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          `┃          URL: ${green}${url}${reset}`,
          `┃     High DPI: ${green}${url}?dpi=5${reset}`,
          `┃ Width/Height: ${green}${url}?width=4000&width=4000${reset}`,
          "┃",
          "┃ Happy creative coding!",
          "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      );
    }
  );
})();
