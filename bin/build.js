#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const template = require('lodash.template')
const browserify = require('browserify')
const UglifyJS = require('uglify-es')
const { repository } = require("../package.json");

const { findSessionFromCli, getAllSessions } = require('./common')
const babelify = require('babelify');
const exorcist = require('exorcist')

async function run() {
  // Run the build script.
  const sessions = getAllSessions()
  const sessionSlug = findSessionFromCli();

  if (sessionSlug) {
    await browserifyBundle(sessionSlug);
    // generateThumbnail(sessionSlug)
  }
  updateReadme(sessions)
  generateAllHtml(sessions)
}

run();

function updateReadme (sessions) {
  const readmeTemplatePath = path.resolve(__dirname, '../html/README.template.md')
  const readmeDestination = path.resolve(__dirname, '../README.md')
  const readmeTemplate = template(fs.readFileSync(readmeTemplatePath, 'utf8'))

  fs.writeFileSync(readmeDestination, readmeTemplate({
    thumbs: sessions.slice().reverse().map(({fileName}) => (
      `[![Session ${fileName}](./${fileName}/thumb.jpg)](http://sessions-2d.gregtatum.com/${fileName})`
    )).join('\n')
  }));

  console.log('Updated README at: ' + readmeDestination)
}

async function browserifyBundle (sessionSlug) {
  const scriptPath = path.resolve(__dirname, '../', sessionSlug, 'index.js')
  const bundlePath = path.resolve(__dirname, '../', sessionSlug, 'bundle.js')
  const sourceMapPath = path.resolve(__dirname, '../', sessionSlug, 'bundle.js.map')

  const stream = require("stream");
  const { promisify } = require('util')
  const streamFinished = promisify(stream.finished);

  console.log(`Start bundling: "${scriptPath}"`)
  await streamFinished(
    browserify(scriptPath, { debug: true })
      .plugin(require('bundle-collapser/plugin'))
      .transform(babelify.configure({ presets: ["@babel/preset-env"] }))
      .transform('uglifyify', { global: true })
      .bundle()
      .pipe(exorcist(sourceMapPath))
      .pipe(fs.createWriteStream(bundlePath, 'utf8'))
  );
  console.log(`Bundling finish: "${bundlePath}"`)

  const { size } = fs.statSync(bundlePath);
  console.log(`Bundle size: ${Math.floor(size / 1024)}kb`)
}

function generateThumbnail (sessionSlug) {
  // Through magic and wizardy, render this out to disc using headless-gl.
  require(`../${sessionSlug}`)
}

function getDirectories (directory) {
  return fs.readdirSync(directory).filter(function (file) {
    return fs.statSync(path.join(directory, file)).isDirectory()
  })
}

function generateAllHtml (sessions) {
  for (const {fileName} of sessions) {
    generateHTML(sessions, fileName);
  }
}

function generateHTML (sessions, sessionSlug) {
  const htmlTemplatePath = path.resolve(__dirname, '../html/index.template.html')
  const htmlDestination = path.resolve(__dirname, '../', sessionSlug, 'index.html')
  const packageDestination = path.resolve(__dirname, '../', sessionSlug, 'package.json')
  const htmlTemplate = template(fs.readFileSync(htmlTemplatePath, 'utf8'))

  const projectIndex = sessions.findIndex(session => session.fileName === sessionSlug)
  const previous = sessions[projectIndex - 1]
  const next = sessions[projectIndex + 1]
  const packageJson = require(packageDestination)
  const sessionNumberResult = sessionSlug.match(/\d\d\d/);
  if (!sessionNumberResult) {
    throw new Error("Could not find a session number for the session slug");
  }
  const [sessionNumber] = sessionNumberResult;
  if (!sessionNumber) {
    throw new Error("Could not find a session number.")
  }

  fs.writeFileSync(htmlDestination, htmlTemplate({
    sessionNumber,
    previous: `<a href='${previous ? `../${previous.fileName}` : repository}'>&lt;</a>`,
    next: `<a href='${next ? `../${next.fileName}` : repository}'>&gt;</a>`,
    name: packageJson.name
  }))

  console.log('Updated HTML file at: ' + htmlDestination)
}

function getDirectories (directory) {
  return fs.readdirSync(directory).filter(function (file) {
    return fs.statSync(path.join(directory, file)).isDirectory()
  })
}

function getSessionFromCli() {
  const fs = require('fs')
  const path = require('path')
  const sessionNumber = process.argv[2]
  const dir = path.resolve(__dirname, `../${sessionNumber}`)

  if (!sessionNumber || !sessionNumber.match(/^\d\d\d$/)) {
    throw new Error(
      'The session number was not in the form of 000. Please pass the session ' +
      'number as the first parameter when launching this script from node.'
    )
  }

  if (!fs.existsSync(dir)) {
    throw new Error(`The session folder "${sessionNumber}" did not exist.`)
  }

  return sessionNumber
}
