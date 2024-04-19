const fs = require("fs");
// const debug = require("debug")("Eleventy:Image");

class DiskCache {
  constructor() {
    this.hitCounter = 0;
  }

  isCached(path) {
    if(fs.existsSync(path)) {
      this.hitCounter++;
      // debug("Images re-used (via disk cache): %o", this.hitCounter);
      return true;
    }

    return false;
  }
}

module.exports = DiskCache;
