const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { URL } = require("url");
const { createHash } = require("crypto");
const {default: PQueue} = require("p-queue");
const getImageSize = require("image-size");
const sharp = require("sharp");
const debug = require("debug")("EleventyImg");

const svgHook = require("./format-hooks/svg");

const {RemoteAssetCache, queue} = require("@11ty/eleventy-fetch");
const MemoryCache = require("./memory-cache");

const globalOptions = {
  widths: [null],
  formats: ["webp", "jpeg"], // "png", "svg", "avif"
  concurrency: 10,
  urlPath: "/img/",
  outputDir: "img/",
  svgShortCircuit: false, // skip raster formats if SVG input is found
  svgAllowUpscale: true,
  // overrideInputFormat: false, // internal, used to force svg output in statsSync et al
  sharpOptions: {}, // options passed to the Sharp constructor
  sharpWebpOptions: {}, // options passed to the Sharp webp output method
  sharpPngOptions: {}, // options passed to the Sharp png output method
  sharpJpegOptions: {}, // options passed to the Sharp jpeg output method
  sharpAvifOptions: {}, // options passed to the Sharp avif output method
  extensions: {},
  formatHooks: {
    svg: svgHook,
  },
  cacheDuration: "1d", // deprecated, use cacheOptions.duration
  // disk cache for remote assets
  cacheOptions: {
    // duration: "1d",
    // directory: ".cache",
    // removeUrlQueryParams: false,
    // fetchOptions: {},
  },

  filenameFormat: null,

  // urlFormat allows you to return a full URL to an image including the domain.
  // Useful when you’re using your own hosted image service (probably via .statsSync or .statsByDimensionsSync)
  // Note: when you use this, metadata will not include .filename or .outputPath
  urlFormat: null,

  // If true, skips all image processing, just return stats. Doesn’t read files, doesn’t write files.
  // Important to note that `dryRun: true` performs image processing and includes a buffer—this does not.
  // Useful when used with `urlFormat` above.
  // Better than .statsSync* functions, because this will use the in-memory cache and de-dupe requests. Those will not.
  statsOnly: false,
  remoteImageMetadata: {}, // For `statsOnly` remote images, this needs to be populated with { width, height, format? }

  useCache: true, // in-memory cache
  dryRun: false, // Also returns a buffer instance in the return object. Doesn’t write anything to the file system

  hashLength: 10, // Truncates the hash to this length

  // Advanced
  useCacheValidityInHash: true,
};

const MIME_TYPES = {
  "jpeg": "image/jpeg",
  "webp": "image/webp",
  "png": "image/png",
  "svg": "image/svg+xml",
  "avif": "image/avif",
  "gif": "image/gif",
};

const FORMAT_ALIASES = {
  "jpg": "jpeg",
  // if you’re working from a mime type input, let’s alias it back to svg
  "svg+xml": "svg",
};

class Util {
  /*
   * Does not mutate, returns new Object
   * Note if keysToKeep is empty it will keep all keys.
   */
  static getSortedObject(unordered) {
    let keys = Object.keys(unordered).sort();
    let obj = {};
    for(let key of keys) {
      obj[key] = unordered[key];
    }
    return obj;
  }

  static isRemoteUrl(url) {
    try {
      const validUrl = new URL(url);

      if (validUrl.protocol.startsWith("https:") || validUrl.protocol.startsWith("http:")) {
        return true;
      }

      return false;
    } catch(e)

    {
      // invalid url OR local path
      return false;
    }
  }
}

// Temporary alias for changes made in https://github.com/11ty/eleventy-img/pull/138
Util.isFullUrl = Util.isRemoteUrl;

class Image {
  constructor(src, options) {
    if(!src) {
      throw new Error("`src` is a required argument to the eleventy-img utility (can be a String file path, String URL, or Buffer).");
    }

    this.src = src;
    this.isRemoteUrl = typeof src === "string" && Util.isRemoteUrl(src);
    this.options = Object.assign({}, globalOptions, options);

    if(this.isRemoteUrl) {
      this.cacheOptions = Object.assign({
        duration: this.options.cacheDuration, // deprecated
        dryRun: this.options.dryRun, // Issue #117: re-use eleventy-img dryRun option value for eleventy-fetch dryRun
        type: "buffer"
      }, this.options.cacheOptions);

      this.assetCache = new RemoteAssetCache(src, this.cacheOptions.directory, this.cacheOptions);
    }
  }

  // In memory cache is up front, handles promise de-duping from input (this does not use getHash)
  // Note: output cache is also in play below (uses getHash)
  getInMemoryCacheKey() {
    let opts = Util.getSortedObject(this.options);

    opts.__originalSrc = this.src;

    if(this.isRemoteUrl) {
      opts.sourceUrl = this.src; // the source url

      if(this.assetCache && this.cacheOptions) {
        // valid only if asset cached file is still valid
        opts.__validAssetCache = this.assetCache.isCacheValid(this.cacheOptions.duration);
      }
    } else if(Buffer.isBuffer(this.src)) {
      opts.sourceUrl = this.src.toString();
      opts.__originalSize = this.src.length;
    } else {
      // TODO @zachleat (multiread): another read
      opts.__originalSize = fs.statSync(this.src).size;
    }


    return JSON.stringify(opts);
  }

  getFileContents() {
    if(this.isRemoteUrl) {
      return false;
    }

    // perf: check to make sure it’s not a string first
    if(typeof this.src !== "string" && Buffer.isBuffer(this.src)) {
      this._contents = this.src;
    }

    // TODO @zachleat add a smarter cache here (not too aggressive! must handle input file changes)
    if(!this._contents) {
      debug("Reading from file system: %o", this.src);
      this._contents = fs.readFileSync(this.src);
    }

    return this._contents;
  }

  static getValidWidths(originalWidth, widths = [], allowUpscale = false) {
    // replace any falsy values with the original width
    let valid = widths.map(width => !width || width === 'auto' ? originalWidth : width);

    // Convert strings to numbers, "400" (floats are not allowed in sharp)
    valid = valid.map(width => parseInt(width, 10));

    // Remove duplicates (e.g., if null happens to coincide with an explicit width
    // or a user passes in multiple duplicate values)
    valid = [...new Set(valid)];

    // filter out large widths if upscaling is disabled
    let filtered = valid.filter(width => allowUpscale || width <= originalWidth);

    // if the only valid width was larger than the original (and no upscaling), then use the original width
    if(valid.length > 0 && filtered.length === 0) {
      filtered.push(originalWidth);
    }

    // sort ascending
    return filtered.sort((a, b) => a - b);
  }

  static getFormatsArray(formats, autoFormat) {
    if(formats && formats.length) {
      if(typeof formats === "string") {
        formats = formats.split(",");
      }

      formats = formats.map(format => {
        if(autoFormat) {
          if((!format || format === "auto")) {
            format = autoFormat;
          }
        }

        if(FORMAT_ALIASES[format]) {
          return FORMAT_ALIASES[format];
        }
        return format;
      });

      // svg must come first for possible short circuiting
      formats.sort((a, b) => {
        if(a === "svg") {
          return -1;
        } else if(b === "svg") {
          return 1;
        }
        return 0;
      });

      // Remove duplicates (e.g., if null happens to coincide with an explicit format
      // or a user passes in multiple duplicate values)
      formats = [...new Set(formats)];

      return formats;
    }

    return [];
  }

  _transformRawFiles(files = [], formats = []) {
    let byType = {};
    for(let format of formats) {
      if(format && format !== 'auto') {
        byType[format] = [];
      }
    }
    for(let file of files) {
      if(!byType[file.format]) {
        byType[file.format] = [];
      }
      byType[file.format].push(file);
    }
    for(let type in byType) {
      // sort by width, ascending (for `srcset`)
      byType[type].sort((a, b) => {
        return a.width - b.width;
      });
    }
    return byType;
  }

  getSharpOptionsForFormat(format) {
    if(format === "webp") {
      return this.options.sharpWebpOptions;
    } else if(format === "jpeg") {
      return this.options.sharpJpegOptions;
    } else if(format === "png") {
      return this.options.sharpPngOptions;
    } else if(format === "avif") {
      return this.options.sharpAvifOptions;
    }
    return {};
  }

  async getInput() {
    if(this.isRemoteUrl) {
      // fetch remote image Buffer
      if(queue) {
        // eleventy-fetch 3.0+ and eleventy-cache-assets 2.0.4+
        return queue(this.src, () => this.assetCache.fetch());
      }

      // eleventy-cache-assets 2.0.3 and below
      return this.assetCache.fetch(this.cacheOptions);
    }

    // TODO @zachleat (multiread): read local file contents here and always return a buffer
    return this.src;
  }

  getHash() {
    if (this.computedHash) {
      debug("Re-using computed hash for %o: %o", this.src, this.computedHash);
      return this.computedHash;
    }

    let hash = createHash("sha256");

    if(fs.existsSync(this.src)) {
      let fileContents = this.getFileContents();

      // remove all newlines for hashing for better cross-OS hash compatibility (Issue #122)
      let fileContentsStr = fileContents.toString();
      let firstFour = fileContentsStr.trim().slice(0, 5);
      if(firstFour === "<svg " || firstFour === "<?xml") {
        fileContents = fileContentsStr.replace(/\r|\n/g, '');
      }

      hash.update(fileContents);
    } else {
      // probably a remote URL
      hash.update(this.src);

      // add whether or not the cached asset is still valid per the cache duration (work with empty duration or "*")
      if(this.options.useCacheValidityInHash && this.isRemoteUrl && this.assetCache && this.cacheOptions) {
        hash.update(`ValidCache:${this.assetCache.isCacheValid(this.cacheOptions.duration)}`);
      }
    }

    // We ignore all keys not relevant to the file processing/output (including `widths`, which is a suffix added to the filename)
    // e.g. `widths: [300]` and `widths: [300, 600]`, with all else being equal the 300px output of each should have the same hash
    let keysToKeep = [
      "sharpOptions",
      "sharpWebpOptions",
      "sharpPngOptions",
      "sharpJpegOptions",
      "sharpAvifOptions"
    ].sort();

    let hashObject = {};
    // The code currently assumes are keysToKeep are Object literals (see Util.getSortedObject)
    for(let key of keysToKeep) {
      if(this.options[key]) {
        hashObject[key] = Util.getSortedObject(this.options[key]);
      }
    }

    hash.update(JSON.stringify(hashObject));

    // TODO allow user to update other things into hash

    // Get hash in base64, and make it URL safe.
    // NOTE: When increasing minimum Node version to 14,
    // replace with hash.digest('base64url')
    // ANOTHER NOTE: some risk here as I found that not all Nodes have this (e.g. Stackblitz’s Node 16 does not)
    let base64hash = hash.digest('base64').replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const resultHash = base64hash.substring(0, this.options.hashLength);

    this.computedHash = resultHash;

    return resultHash;
  }

  getStat(outputFormat, width, height) {
    let url;
    let outputFilename;
    let outputExtension = this.options.extensions[outputFormat] || outputFormat;
    if(this.options.urlFormat && typeof this.options.urlFormat === "function") {
      let hash;
      if(!this.options.statsOnly) {
        hash = this.getHash();
      }

      url = this.options.urlFormat({
        hash,
        src: this.src,
        width,
        format: outputExtension,
      }, this.options);
    } else {
      let hash = this.getHash();
      outputFilename = ImagePath.getFilename(hash, this.src, width, outputExtension, this.options);
      url = ImagePath.convertFilePathToUrl(this.options.urlPath, outputFilename);
    }

    let stats = {
      format: outputFormat,
      width: width,
      height: height,
      url: url,
      sourceType: MIME_TYPES[outputFormat],
      srcset: `${url} ${width}w`,
      // Not available in stats* functions below
      // size // only after processing
    };

    if(outputFilename) {
      stats.filename = outputFilename; // optional
      stats.outputPath = path.join(this.options.outputDir, outputFilename); // optional
    }

    return stats;
  }

  // https://jdhao.github.io/2019/07/31/image_rotation_exif_info/
  // Orientation 5 to 8 means image is rotated (width/height are flipped)
  needsRotation(orientation) {
    return orientation >= 5;
  }

  // metadata so far: width, height, format
  // src is used to calculate the output file names
  getFullStats(metadata) {
    let results = [];
    let outputFormats = Image.getFormatsArray(this.options.formats, metadata.format || this.options.overrideInputFormat);

    if (this.needsRotation(metadata.orientation)) {
      let height = metadata.height;
      let width = metadata.width;
      metadata.width = height;
      metadata.height = width;
    }

    for(let outputFormat of outputFormats) {
      if(!outputFormat || outputFormat === "auto") {
        throw new Error("When using statsSync or statsByDimensionsSync, `formats: [null | auto]` to use the native image format is not supported.");
      }
      if(outputFormat === "svg") {
        if((metadata.format || this.options.overrideInputFormat) === "svg") {
          let svgStats = this.getStat("svg", metadata.width, metadata.height);
          // SVG metadata.size is only available with Buffer input (remote urls)
          if(metadata.size) {
            // Note this is unfair for comparison with raster formats because its uncompressed (no GZIP, etc)
            svgStats.size = metadata.size;
          }
          results.push(svgStats);

          if(this.options.svgShortCircuit) {
            break;
          } else {
            continue;
          }
        } else {
          debug("Skipping SVG output for %o: received raster input.", this.src);
          continue;
        }
      } else { // not outputting SVG (might still be SVG input though!)
        let widths = Image.getValidWidths(metadata.width, this.options.widths, metadata.format === "svg" && this.options.svgAllowUpscale);
        for(let width of widths) {
          // Warning: if this is a guess via statsByDimensionsSync and that guess is wrong
          // The aspect ratio will be wrong and any height/widths returned will be wrong!
          let height = Math.floor(width * metadata.height / metadata.width);

          results.push(this.getStat(outputFormat, width, height));
        }
      }
    }

    return this._transformRawFiles(results, outputFormats);
  }

  // src should be a file path to an image or a buffer
  async resize(input) {
    let sharpImage = sharp(input, Object.assign({
      failOnError: false
    }, this.options.sharpOptions));

    // Must find the image format from the metadata
    // File extensions lie or may not be present in the src url!
    let metadata = await sharpImage.metadata();
    let outputFilePromises = [];

    let fullStats = this.getFullStats(metadata);
    for(let outputFormat in fullStats) {
      for(let stat of fullStats[outputFormat]) {
        if(this.options.useCache && fs.existsSync(stat.outputPath)){
          stat.size = fs.statSync(stat.outputPath).size;
          if(this.options.dryRun) {
            stat.buffer = this.getFileContents();
          }

          outputFilePromises.push(Promise.resolve(stat));
          continue;
        }

        let sharpInstance = sharpImage.clone();
        if(stat.width < metadata.width || (this.options.svgAllowUpscale && metadata.format === "svg")) {
          let resizeOptions = {
            width: stat.width
          };
          if(metadata.format !== "svg" || !this.options.svgAllowUpscale) {
            resizeOptions.withoutEnlargement = true;
          }
          if(this.needsRotation(metadata.orientation)) {
            sharpInstance.rotate();
          }
          sharpInstance.resize(resizeOptions);
        } else if (stat.width === metadata.width && metadata.format !== "svg") {
          if(this.needsRotation(metadata.orientation)) {
            sharpInstance.rotate();
          }
        }

        if(!this.options.dryRun) {
          await fsp.mkdir(this.options.outputDir, {
            recursive: true
          });
        }

        // format hooks are only used for SVG out of the box
        if(this.options.formatHooks && this.options.formatHooks[outputFormat]) {
          let hookResult = await this.options.formatHooks[outputFormat].call(stat, sharpInstance);
          if(hookResult) {
            stat.size = hookResult.length;
            if(this.options.dryRun) {
              stat.buffer = Buffer.from(hookResult);
              outputFilePromises.push(Promise.resolve(stat));
            } else {
              outputFilePromises.push(fsp.writeFile(stat.outputPath, hookResult).then(() => stat));
            }
          }
        } else { // not a format hook
          let sharpFormatOptions = this.getSharpOptionsForFormat(outputFormat);
          let hasFormatOptions = Object.keys(sharpFormatOptions).length > 0;
          if(hasFormatOptions || outputFormat && metadata.format !== outputFormat) {
            sharpInstance.toFormat(outputFormat, sharpFormatOptions);
          }

          if(!this.options.dryRun && stat.outputPath) {
            // Should never write when dryRun is true
            outputFilePromises.push(sharpInstance.toFile(stat.outputPath).then(info => {
              stat.size = info.size;
              return stat;
            }));
          } else {
            outputFilePromises.push(sharpInstance.toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
              stat.buffer = data;
              stat.size = info.size;
              return stat;
            }));
          }
        }

        if(stat.outputPath) {
          debug( "Wrote %o", stat.outputPath );
        }
      }
    }

    return Promise.all(outputFilePromises).then(files => this._transformRawFiles(files, Object.keys(fullStats)));
  }

  /* `statsSync` doesn’t generate any files, but will tell you where
  * the asynchronously generated files will end up! This is useful
  * in synchronous-only template environments where you need the
  * image URLs synchronously but can’t rely on the files being in
  * the correct location yet.
  *
  * `options.dryRun` is still asynchronous but also doesn’t generate
  * any files.
  */
  static statsSync(src, opts) {
    if(typeof src === "string" && Util.isRemoteUrl(src)) {
      throw new Error("`statsSync` is not supported with remote sources. Use `statsByDimensionsSync` instead.");
    }

    let dimensions = getImageSize(src);

    let img = new Image(src, opts);
    return img.getFullStats({
      width: dimensions.width,
      height: dimensions.height,
      format: dimensions.type,
    });
  }

  static statsByDimensionsSync(src, width, height, opts) {
    let dimensions = {
      width,
      height,
      guess: true
    };

    let img = new Image(src, opts);
    return img.getFullStats(dimensions);
  }
}

class ImagePath {
  static filenameFormat(id, src, width, format) { // and options
    if (width) {
      return `${id}-${width}.${format}`;
    }

    return `${id}.${format}`;
  }

  static getFilename(id, src, width, format, options = {}) {
    if (typeof options.filenameFormat === "function") {
      let filename = options.filenameFormat(id, src, width, format, options);
      // if options.filenameFormat returns falsy, use fallback filename
      if(filename) {
        return filename;
      }
    }

    return ImagePath.filenameFormat(id, src, width, format, options);
  }

  static convertFilePathToUrl(dir, filename) {
    let src = path.join(dir, filename);
    return src.split(path.sep).join("/");
  }
}

/* Size Cache */
let memCache = new MemoryCache();

/* Queue */
let processingQueue = new PQueue({
  concurrency: globalOptions.concurrency
});
processingQueue.on("active", () => {
  debug( `Concurrency: ${processingQueue.concurrency}, Size: ${processingQueue.size}, Pending: ${processingQueue.pending}` );
});

function queueImage(src, opts) {
  let img = new Image(src, opts);
  let key;

  if(img.options.useCache) {
    // we don’t know the output format yet, but this hash is just for the in memory cache
    key = img.getInMemoryCacheKey();
    let cached = memCache.get(key);
    if(cached) {
      return cached;
    }
  }

  debug("In-memory cache miss for %o, options: %o", src, opts);

  let promise = processingQueue.add(async () => {
    if(typeof src === "string" && opts && opts.statsOnly) {
      if(Util.isRemoteUrl(src)) {
        if(!opts.remoteImageMetadata || !opts.remoteImageMetadata.width || !opts.remoteImageMetadata.height) {
          throw new Error("When using `statsOnly` and remote images, you must supply a `remoteImageMetadata` object with { width, height, format? }");
        }
        return img.getFullStats({
          width: opts.remoteImageMetadata.width,
          height: opts.remoteImageMetadata.height,
          format: opts.remoteImageMetadata.format, // only required if you want to use the "auto" format
          guess: true,
        });
      } else { // Local images
        let { width, height, type } = getImageSize(src);
        return img.getFullStats({
          width,
          height,
          format: type // only required if you want to use the "auto" format
        });
      }
    }

    let input = await img.getInput();
    return img.resize(input);
  });

  if(img.options.useCache) {
    memCache.add(key, promise);
  }

  return promise;
}

// Exports

module.exports = queueImage;

Object.defineProperty(module.exports, "concurrency", {
  get: function() {
    return processingQueue.concurrency;
  },
  set: function(concurrency) {
    processingQueue.concurrency = concurrency;
  },
});

module.exports.Util = Util;
module.exports.Image = Image;
module.exports.ImagePath = ImagePath;

module.exports.statsSync = Image.statsSync;
module.exports.statsByDimensionsSync = Image.statsByDimensionsSync;
module.exports.getFormats = Image.getFormatsArray;
module.exports.getWidths = Image.getValidWidths;

module.exports.getHash = function getHash(src, options) {
  let img = new Image(src, options);
  return img.getHash();
};

const generateHTML = require("./generate-html");
module.exports.generateHTML = generateHTML;
module.exports.generateObject = generateHTML.generateObject;
