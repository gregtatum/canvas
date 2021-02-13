#!/usr/bin/env node
const { findSessionFromCli } = require("./common");
const jimp = require("jimp");
const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");

{
  const usage = "Usage: yarn add-image 001-tick-tock /path/to/screenshot.png";
  const session = findSessionFromCli();
  if (!session) {
    console.error("No session was specified");
    console.error(usage);
    console.error();
    process.exit();
  }

  const imagePath = process.argv[3];
  if (!imagePath) {
    console.error("No image was specified.");
    console.error(usage);
    console.error();
    process.exit();
  }

  try {
    const stat = fs.statSync(imagePath);
    if (!stat.isFile()) {
      console.error("The source image is not a file.");
      process.exit();
    }
  } catch (error) {
    console.error("Could not find the source image", process.argv[3]);
    process.exit();
  }

  addJpegImage(imagePath, session).catch(error => {
    throw error;
  });
}

async function addJpegImage(sourceImagePath, session) {
  const imagePath = path.join(session, "image.jpg");
  const thumbPath = path.join(session, "thumb.jpg");

  const image = await jimp.read(sourceImagePath);
  const imageWidth = image.bitmap.width;
  const imageHeight = image.bitmap.height;
  const thumbWidth = 292;
  const thumbHeight = 164;
  const targetHeight = 1024;
  const targetWidth = (targetHeight / imageHeight) * imageWidth;

  const copiedOriginalPath = path.join(
    session,
    "original." + image.getExtension()
  );

  execSync(`cp ${sourceImagePath} ${copiedOriginalPath}`);

  console.log("Copied original:", copiedOriginalPath);

  await (await jimp.read(sourceImagePath))
    .cover(thumbWidth, thumbHeight)
    .quality(90)
    .write(thumbPath);

  console.log("Created thumbnail:", thumbPath);

  await (await jimp.read(sourceImagePath))
    .resize(targetWidth, targetHeight)
    .quality(90)
    .write(imagePath);

  console.log("Created image:", imagePath);
}
