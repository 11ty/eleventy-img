const fs = require("fs");
const debug = require("debug")("EleventyImg");

class FileSizeCache {
  constructor() {
    this.cache = {};
    debug("New cache.");
  }

  getSize(path) {
    let stats = fs.statSync(path);
    return stats.size;
  }

  add(options, results) {
    let key = JSON.stringify(options);
    debug("Before add cache size %o", Object.keys(this.cache).length);
    debug("Added %o to cache: %o", key, results);

    this.cache[key] = {
      results
    };
  }

  get(options) {
    let key = JSON.stringify(options);
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

module.exports = FileSizeCache;
