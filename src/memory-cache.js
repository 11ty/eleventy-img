const debug = require("debug")("EleventyImg");

class MemoryCache {
  constructor() {
    this.cache = {};
  }

  add(key, results) {
    this.cache[key] = {
      results
    };

    debug("Added %o to cache (size: %o)", key, Object.keys(this.cache).length);
  }

  get(key) {
    if(this.cache[key]) {
      // may return promise
      // debug("Cache size %o", Object.keys(this.cache).length);
      // debug("Found cached for %o", key);
      return this.cache[key].results;
    }

    debug("Cache miss for %o", key);

    return false;
  }
}

module.exports = MemoryCache;
