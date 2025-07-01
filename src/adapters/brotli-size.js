import brotliSize from "brotli-size";

export default function(contents) {
  return brotliSize.sync(contents);
};
