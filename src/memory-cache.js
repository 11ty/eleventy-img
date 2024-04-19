const debug = require("debug")("Eleventy:Image");

class MemoryCache {
  constructor() {
    this.cache = {};
    this.hitCounter = 0;
  }

  add(key, results) {
    this.cache[key] = {
      results
    };

    debug("Unique images processed: %o", Object.keys(this.cache).length);
  }

  get(key) {
    if(this.cache[key]) {
      this.hitCounter++;
      // debug("Images re-used (via in-memory cache): %o", this.hitCounter);

      // may return promise
      return this.cache[key].results;
    }

    return false;
  }
}

module.exports = MemoryCache;
