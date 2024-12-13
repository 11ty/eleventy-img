const fs = require("node:fs");
// const debug = require("debug")("Eleventy:Image");

class DiskCache {
  #existsCache;

  constructor() {
    this.hitCounter = 0;
    this.missCounter = 0;
    this.inputs = new Map();
  }

  setExistsCache(existsCache) {
    this.#existsCache = existsCache;
  }

  resetCount() {
    this.hitCounter = 0;
    this.missCounter = 0;
  }

  getCount() {
    return [this.hitCounter, this.missCounter];
  }

  isCached(path, input, incrementCounts = true) {
    // Disk cache runs once per output file, so we only want to increment counts once per input
    if(this.inputs.has(input)) {
      incrementCounts = false;
    }

    this.inputs.set(input, true);

    if(this.#existsCache?.exists(path) || fs.existsSync(path)) {
      if(incrementCounts) {
        this.hitCounter++;
      }

      // debug("Images re-used (via disk cache): %o", this.hitCounter);
      return true;
    }

    if(incrementCounts) {
      this.inputs.set(input, true);
      this.missCounter++;
    }

    return false;
  }
}

module.exports = DiskCache;
