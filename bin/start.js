#!/usr/bin/env node
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const budo = require('budo');
const { findSessionFromCli, getAllSessions } = require('./common');

(async () => {
  let pathToSession = findSessionFromCli()
  if (!pathToSession) {
    const sessions = getAllSessions();

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileName',
        message: 'Which session do you want to run?',
        choices: sessions.map(session => session.fileName),
      },
    ]);

    pathToSession = sessions
      .find(session => session.fileName === answers.fileName)
      .pathToSession;
  }

  if (!pathToSession) {
    throw new Error("Could not find a path to the session. This is a programming error.");
  }

  budo(pathToSession, {
    live: true,
    stream: process.stdout,
    port: 9966,
    css: 'html/style.css',
  });
})();
