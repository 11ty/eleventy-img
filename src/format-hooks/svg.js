const fsp = require("fs").promises;

module.exports = async function createSvg(sharpInstance) {
  let input = sharpInstance.options.input;
  let svgBuffer = input.buffer;
  if(svgBuffer) { // remote URL already has buffer
    return svgBuffer;
  } else { // local file system
    return fsp.readFile(input.file);
  }
};
