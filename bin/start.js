#!/usr/bin/env node
const inquirer = require("inquirer");
const {
  findSessionFromCli,
  getAllSessions,
  getWebpackConfig,
} = require("./common");
const path = require("path");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");

(async () => {
  let pathToSession = findSessionFromCli();
  if (!pathToSession) {
    const sessions = getAllSessions();

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "fileName",
        message: "Which session do you want to run?",
        choices: sessions.map(session => session.fileName),
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

  const config = getWebpackConfig({
    title: sessionSlug,
    entry: path.join(pathToSession, "index.ts"),
    isDevelopment: true,
    template: "dev.template.html",
    templateParameters: {},
    outputPath: path.resolve(__dirname, "../"),
    outputPublicPath: "/",
  });

  const serverConfig = {
    contentBase: config.output.path,
    publicPath: config.output.publicPath,
    hot: process.env.NODE_ENV === "development" ? true : false,
    stats: { colors: true },
  };

  new WebpackDevServer(webpack(config), serverConfig).listen(
    9966,
    "localhost",
    function(err) {
      if (err) {
        console.log(err);
      }
      console.log("Happy creative coding!");
    }
  );
})();
