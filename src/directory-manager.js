import fs from "node:fs";
import path from "node:path";
import debugUtil from "debug";

const debugAssets = debugUtil("Eleventy:Assets");

export default class DirectoryManager {
  #dirs = new Set();

  isCreated(dir) {
    return this.#dirs.has(dir);
  }

  create(dir) {
    if(this.isCreated(dir)) {
      return;
    }

    this.#dirs.add(dir);
    debugAssets("[11ty/eleventy-img] Creating directory %o", dir);
    fs.mkdirSync(dir, { recursive: true });
  }

  createFromFile(filepath) {
    let dir = path.dirname(filepath);
    this.create(dir);
  }
}
