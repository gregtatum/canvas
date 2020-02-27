#!/usr/bin/env node
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const budo = require('budo');

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
    live: true, // live reload
    stream: process.stdout, // log to stdout
    port: 9966, // use this as the base port
  });
})();

function getAllSessions() {
  const dir = path.join(__dirname, '../src');
  const sessions = [];

  // Go through the src directory and get all of the projects
  // that start with numbers.
  for (const fileName of fs.readdirSync(dir)) {
    const pathToSession = path.join(dir, fileName);
    if (fs.statSync(pathToSession).isDirectory()) {
      // Does the filename start with numbers?
      if (fileName.match(/^\d+/)) {
        sessions.push({ fileName, pathToSession });
      }
    }
  }

  // Sort the projects alphabetically.
  sessions.sort((a, b) => a.fileName - b.fileName);

  return sessions;
}

function findSessionFromCli() {
  const session = process.argv[2];
  if (!session) {
    return null;
  }
  // Don't trust this path too much.
  const { name } = path.parse(session);
  const pathToSession = path.join(__dirname, "../src", name);
  try {
    if (fs.statSync(pathToSession).isDirectory()) {
      return pathToSession;
    }
  } catch (error) {}

  console.error(`Could not find the session "${session}".`);
  console.error(`Looked in: ${pathToSession}`);
  process.exit();
}
