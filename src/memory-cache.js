const debug = require("debug")("Eleventy:Image");

class MemoryCache {
  constructor() {
    this.cache = {};
    this.hitCounter = 0;
    this.missCounter = 0;
  }

  resetCount() {
    this.hitCounter = 0;
    this.missCounter = 0;
  }

  getCount() {
    return [this.hitCounter, this.missCounter];
  }

  add(key, results) {
    this.cache[key] = {
      results
    };

    debug("Unique images processed: %o", Object.keys(this.cache).length);
  }

  get(key, incrementCounts = false) {
    if(this.cache[key]) {
      if(incrementCounts) {
        this.hitCounter++;
      }
      // debug("Images re-used (via in-memory cache): %o", this.hitCounter);

      // may return promise
      return this.cache[key].results;
    }

    if(incrementCounts) {
      this.missCounter++;
    }

    return false;
  }
}

module.exports = MemoryCache;
