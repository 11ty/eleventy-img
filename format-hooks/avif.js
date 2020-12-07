// via the excellent @cramforce at https://github.com/google/eleventy-high-performance-blog/blob/5607091bceec56b89ddc4f9bc9a0cd339e1d67bc/_11ty/avif.js

const wasm_avif = require("@saschazar/wasm-avif");
const defaultOptions = require("@saschazar/wasm-avif/options");

defaultOptions.minQuantizer = 33;
defaultOptions.maxQuantizer = 63;
defaultOptions.minQuantizerAlpha = 33;
defaultOptions.maxQuantizerAlpha = 63;

module.exports = async function createAvif(sharpInstance) {

  const inputInfo = await sharpInstance
    .raw()
    .toBuffer({
      resolveWithObject: true,
    });

  const input = inputInfo.data;
  const info = inputInfo.info;

  // console.log(
  //   "Encoding avif image. If this is slow, consid caching images in git with ./persistimages.sh"
  // );

  // Initialize the WebAssembly Module
  return new Promise((resolve) => {
    wasm_avif({
      onRuntimeInitialized() {
        const chroma = 3; // chroma subsampling: 1 for 4:4:4, 2 for 4:2:2, 3 for 4:2:0
        const r = this.encode(
          input,
          info.width,
          info.height,
          info.channels,
          defaultOptions,
          chroma
        ); // encode image data and return a new Uint8Array
        this.free(); // clean up memory after encoding is done
        resolve(r);
      },
    });
  });
}
