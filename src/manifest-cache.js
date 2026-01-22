import fs from "node:fs";
import path from "node:path";
import { createHashSync } from "@11ty/eleventy-utils";

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
        const content = fs.readFileSync(this.#filepath, "utf8");
        this.#manifest = JSON.parse(content);
      }
    } catch {
      // Corrupted or unreadable - start fresh
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

  #getKey(src, optionsHash) {
    return `${src}::${optionsHash}`;
  }

  get(src, mtime, size, optionsHash) {
    this.load();
    
    const key = this.#getKey(src, optionsHash);
    const entry = this.#manifest[key];
    
    if (!entry) return null;
    if (entry.mtime !== mtime || entry.size !== size) return null;
    
    return entry.stats;
  }

  set(src, mtime, size, optionsHash, stats) {
    this.load();
    
    // Strip buffers before storing
    const cleanStats = {};
    for (const format of Object.keys(stats)) {
      cleanStats[format] = stats[format].map(stat => {
        const copy = { ...stat };
        delete copy.buffer;
        return copy;
      });
    }
    
    const key = this.#getKey(src, optionsHash);
    this.#manifest[key] = { mtime, size, stats: cleanStats };
    this.save();
  }

  // Hash relevant options that affect output
  static hashOptions(options) {
    const relevant = {
      widths: options.widths,
      formats: options.formats,
      sharpOptions: options.sharpOptions,
      sharpWebpOptions: options.sharpWebpOptions,
      sharpPngOptions: options.sharpPngOptions,
      sharpJpegOptions: options.sharpJpegOptions,
      sharpAvifOptions: options.sharpAvifOptions,
    };
    return createHashSync(JSON.stringify(relevant));
  }
}