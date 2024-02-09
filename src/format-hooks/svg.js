const fsp = require("fs").promises;

module.exports = async function createSvg(sharpInstance) {
  let input = sharpInstance.options.input;
  let svgBuffer = input.buffer;
  if(svgBuffer) { // remote URL already has buffer
    return svgBuffer.toString("utf-8");
  } else { // local file system
    return fsp.readFile(input.file);
  }
};
