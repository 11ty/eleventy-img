const fsp = require("fs").promises;

module.exports = async function createSvg(sharpInstance) {
  let input = sharpInstance.options.input;
  let svgBuffer = input.buffer;

  if(svgBuffer) { // remote URL already has buffer
    let svgString = svgBuffer.toString("utf-8")

    if(!svgString.includes('<svg')) {
      // based on https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder#examples
      let utf8decoder = new TextDecoder()
      svgString = utf8decoder.decode(svgBuffer)
    }
    return svgString
  } else { // local file system
    return fsp.readFile(input.file);
  }
};
