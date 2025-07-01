import fs from "node:fs";
import Util from "./util.js";

// Checks both files and directories
export default class ExistsCache {
  #exists = new Map();

  constructor() {
    this.lookupCount = 0;
  }

  get size() {
    return this.#exists.size;
  }

  has(path) {
    return this.#exists.has(path);
  }

  // Relative paths (to root directory) expected (but not enforced due to perf costs)
  exists(path) {
    if(Util.isFullUrl(path)) {
      return false;
    }

    if (!this.#exists.has(path)) {
      let exists = fs.existsSync(path);
      this.lookupCount++;

      // mark for next time
      this.#exists.set(path, Boolean(exists));

      return exists;
    }

    return this.#exists.get(path);
  }
}
