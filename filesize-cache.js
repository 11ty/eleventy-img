const fs = require("fs");

class FileSizeCache {
  constructor() {
    this.cache = {};
  }

  getSize(path) {
    let stats = fs.statSync(path);
    return stats.size;
  }

  add(options, results) {
    let key = JSON.stringify(options);

    this.cache[key] = {
      results
    };
  }

  get(options) {
    let key = JSON.stringify(options);
    if(this.cache[key]) {
      // may return promise
      return this.cache[key].results;
    }

    return false;
  }
}

module.exports = FileSizeCache;
