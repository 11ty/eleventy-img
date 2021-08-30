const debug = require("debug")("EleventyImg");

class MemoryCache {
  constructor() {
    this.cache = {};
    debug("New cache.");
  }

  add(key, results) {
    debug("Before add cache size %o", Object.keys(this.cache).length);
    debug("Added %o to cache: %o", key, results);

    this.cache[key] = {
      results
    };
  }

  get(key) {
    if(this.cache[key]) {
      // may return promise
      debug("Cache size %o", Object.keys(this.cache).length);
      debug("Found cached for %o %o", key, this.cache[key].results);
      return this.cache[key].results;
    }

    debug("Cache miss for %o", key);

    return false;
  }
}

module.exports = MemoryCache;
