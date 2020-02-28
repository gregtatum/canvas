const path = require('path')
const fs = require('fs')

function findSessionFromCli() {
  const session = process.argv[2];
  if (!session) {
    return null;
  }
  // Don't trust this path too much.
  const { name } = path.parse(session);
  const pathToSession = path.join(__dirname, "..", name);
  try {
    if (fs.statSync(pathToSession).isDirectory()) {
      return pathToSession;
    }
  } catch (error) {}

  console.error(`Could not find the session "${session}".`);
  console.error(`Looked in: ${pathToSession}`);
  process.exit();
}

function getAllSessions() {
  const dir = path.join(__dirname, '..');
  const sessions = [];

  // Go through the root directory and get all of the projects
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

module.exports = { findSessionFromCli, getAllSessions };
