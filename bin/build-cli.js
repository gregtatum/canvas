#!/usr/bin/env node
// @ts-check

const { findSessionFromCli } = require("./common");
const { runBuild } = require("./build");

runBuildCli();

function runBuildCli() {
  if (!process.argv[2]) {
    console.log("Usage:");
    console.log("Re-build everything: yarn build main");
    console.log("Re-build a single session: yarn build 001-tick-tock");
    process.exit(0);
  }

  return runBuild(findSessionFromCli());
}
