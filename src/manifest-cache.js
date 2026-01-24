import fs from "node:fs";
import path from "node:path";

export default class ManifestCache {
  #manifest = {};
  #cacheDir;
  #filepath;
  #loaded = false;

  constructor(cacheDir = ".cache") {
    this.#cacheDir = cacheDir;
    this.#filepath = path.join(cacheDir, "eleventy-img-manifest.json");
  }

  load() {
    if (this.#loaded) return;

    try {
      if (fs.existsSync(this.#filepath)) {
        let content = fs.readFileSync(this.#filepath, "utf8");
        this.#manifest = JSON.parse(content);
      }
    } catch {
      // Corrupted or unreadable, start fresh
      this.#manifest = {};
    }
    this.#loaded = true;
  }

  save() {
    if (!fs.existsSync(this.#cacheDir)) {
      fs.mkdirSync(this.#cacheDir, { recursive: true });
    }
    fs.writeFileSync(this.#filepath, JSON.stringify(this.#manifest, null, 2));
  }

  get(key, hash) {
    this.load();

    let entry = this.#manifest[key];
    if (!entry) return null;
    if (entry.hash !== hash) return null;

    return entry.stats;
  }

  set(key, hash, stats) {
    this.load();

    // Strip buffers before storing
    let cleanStats = {};
    for (let format of Object.keys(stats)) {
      cleanStats[format] = stats[format].map(stat => {
        let copy = { ...stat };
        delete copy.buffer;
        return copy;
      });
    }

    this.#manifest[key] = { hash, stats: cleanStats };
    this.save();
  }
}
