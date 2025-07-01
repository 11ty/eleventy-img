import fs from "node:fs";
import debugUtil from "debug";

const debugAssets = debugUtil("Eleventy:Assets");

export default async function createSvg(sharpInstance) {
  let input = sharpInstance.options.input;
  let svgBuffer = input.buffer;
  if(svgBuffer) { // remote URL already has buffer
    return svgBuffer;
  } else { // local file system
    debugAssets("[11ty/eleventy-img] Reading %o", input.file);
    return fs.readFileSync(input.file);
  }
};
