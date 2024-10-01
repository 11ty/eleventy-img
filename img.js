const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

const { createHash } = require("crypto");
const {default: PQueue} = require("p-queue");
const getImageSize = require("image-size");
const sharp = require("sharp");
const brotliSize = require("brotli-size");
const { RemoteAssetCache, queue } = require("@11ty/eleventy-fetch");
const { TemplatePath } = require("@11ty/eleventy-utils");

const svgHook = require("./src/format-hooks/svg.js");
const MemoryCache = require("./src/memory-cache.js");
const DiskCache = require("./src/disk-cache.js");
const DeferCounter = require("./src/defer-counter.js");
const BuildLogger = require("./src/build-logger.js");
const Util = require("./src/util.js");

const debug = require("debug")("Eleventy:Image");

const GLOBAL_OPTIONS = {
  widths: ["auto"],
  formats: ["webp", "jpeg"], // "png", "svg", "avif"

  concurrency: 20,

  urlPath: "/img/",
  outputDir: "img/",

  // true to skip raster formats if SVG input is found
  // "size" to skip raster formats if larger than SVG input
  svgShortCircuit: false,
  svgAllowUpscale: true,
  svgCompressionSize: "", // "br" to report SVG `size` property in metadata as Brotli compressed
  // overrideInputFormat: false, // internal, used to force svg output in statsSync et al
  sharpOptions: {}, // options passed to the Sharp constructor
  sharpWebpOptions: {}, // options passed to the Sharp webp output method
  sharpPngOptions: {}, // options passed to the Sharp png output method
  sharpJpegOptions: {}, // options passed to the Sharp jpeg output method
  sharpAvifOptions: {}, // options passed to the Sharp avif output method

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

  fixOrientation: false, // always rotate images to ensure correct orientation

  // Advanced
  useCacheValidityInHash: true,

  // When the original width is smaller than the desired output width, this is the minimum size difference
  // between the next smallest image width that will generate one extra width in the output.
  // e.g. when using `widths: [400, 800]`, the source image would need to be at least (400 * 1.25 =) 500px wide
  // to generate two outputs (400px, 500px). If the source image is less than 500px, only one output will
  // be generated (400px).
  // Read more at https://github.com/11ty/eleventy-img/issues/184 and https://github.com/11ty/eleventy-img/pull/190
  minimumThreshold: 1.25,

  // During --serve mode in Eleventy, this will generate images on request instead of part of the build skipping
  // writes to the file system and speeding up builds!
  transformOnRequest: false,

  // v5 `extensions` was removed (option to override output format with new file extension), it wasn’t being used anywhere or documented
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

class Image {
  constructor(src, options = {}) {
    if(!src) {
      throw new Error("`src` is a required argument to the eleventy-img utility (can be a String file path, String URL, or Buffer).");
    }

    this.src = src;
    this.isRemoteUrl = typeof src === "string" && Util.isRemoteUrl(src);

    this.options = Object.assign({}, GLOBAL_OPTIONS, options);

    // Compatible with eleventy-dev-server and Eleventy 3.0.0-alpha.7+ in serve mode.
    if(this.options.transformOnRequest && !this.options.urlFormat) {
      this.options.urlFormat = function({ src, width, format }/*, imageOptions*/, options) {
        return `/.11ty/image/?src=${encodeURIComponent(src)}&width=${width}&format=${format}${options.generatedVia ? `&via=${options.generatedVia}` : ""}`;
      };

      this.options.statsOnly = true;
    }

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

  getFileContents(overrideLocalFilePath) {
    if(!overrideLocalFilePath && this.isRemoteUrl) {
      return false;
    }

    let src = overrideLocalFilePath || this.src;
    if(!this._contents) {
      this._contents = {};
    }

    if(!this._contents[src]) {
      // perf: check to make sure it’s not a string first
      if(typeof src !== "string" && Buffer.isBuffer(src)) {
        this._contents[src] = src;
      } else {
        // TODO @zachleat make this aggressively async.
        // TODO @zachleat add a smarter cache here (not too aggressive! must handle input file changes)
        // debug("Reading from file system: %o", src);
        this._contents[src] = fs.readFileSync(src);
      }
    }


    return this._contents[src];
  }

  static getValidWidths(originalWidth, widths = [], allowUpscale = false, minimumThreshold = 1) {
    // replace any falsy values with the original width
    let valid = widths.map(width => !width || width === 'auto' ? originalWidth : width);

    // Convert strings to numbers, "400" (floats are not allowed in sharp)
    valid = valid.map(width => parseInt(width, 10));

    // Replace any larger-than-original widths with the original width if upscaling is not allowed.
    // This ensures that if a larger width has been requested, we're at least providing the closest
    // non-upscaled image that we can.
    if (!allowUpscale) {
      let lastWidthWasBigEnough = true; // first one is always valid
      valid = valid.sort((a, b) => a - b).map(width => {
        if(width > originalWidth) {
          if(lastWidthWasBigEnough) {
            return originalWidth;
          }
          return -1;
        }

        lastWidthWasBigEnough = originalWidth > Math.floor(width * minimumThreshold);

        return width;
      }).filter(width => width > 0);
    }

    // Remove duplicates (e.g., if null happens to coincide with an explicit width
    // or a user passes in multiple duplicate values, or multiple larger-than-original
    // widths have resulted in the original width being included multiple times)
    valid = [...new Set(valid)];

    // sort ascending
    return valid.sort((a, b) => a - b);
  }

  static getFormatsArray(formats, autoFormat, svgShortCircuit) {
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

      if(svgShortCircuit !== "size") {
        // svg must come first for possible short circuiting
        formats.sort((a, b) => {
          if(a === "svg") {
            return -1;
          } else if(b === "svg") {
            return 1;
          }
          return 0;
        });
      }

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

    let filterLargeRasterImages = this.options.svgShortCircuit === "size";
    let svgEntry = byType.svg;
    let svgSize = svgEntry && svgEntry.length && svgEntry[0].size;

    if(filterLargeRasterImages && svgSize) {
      for(let type of Object.keys(byType)) {
        if(type === "svg") {
          continue;
        }

        let svgAdded = false;
        let originalFormatKept = false;
        byType[type] = byType[type].map(entry => {
          if(entry.size > svgSize) {
            if(!svgAdded) {
              svgAdded = true;
              // need at least one raster smaller than SVG to do this trick
              if(originalFormatKept) {
                return svgEntry[0];
              }
              // all rasters are bigger
              return false;
            }

            return false;
          }

          originalFormatKept = true;
          return entry;
        }).filter(entry => entry);
      }
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

  // Returns promise
  getInput() {
    // internal cache
    if(!this.inputPromise) {
      if(this.isRemoteUrl) {
        // fetch remote image Buffer
        if(queue) {
          // eleventy-fetch 3.0+ and eleventy-cache-assets 2.0.4+
          this.inputPromise = queue(this.src, () => this.assetCache.fetch());
        } else {
          // eleventy-cache-assets 2.0.3 and below
          this.inputPromise = this.assetCache.fetch(this.cacheOptions);
        }
      } else {
        // TODO @zachleat (multiread): read local file contents here and always return a buffer
        this.inputPromise = Promise.resolve(this.src);
      }
    }

    return this.inputPromise;
  }

  getHash() {
    if (this.computedHash) {
      return this.computedHash;
    }

    // debug("Creating hash for %o", this.src);
    let hash = createHash("sha256");

    if(fs.existsSync(this.src)) {
      let fileContents = this.getFileContents();

      // If the file starts with whitespace or the '<' character, it might be SVG.
      // Otherwise, skip the expensive buffer.toString() call
      // (no point in unicode encoding a binary file)
      let fileContentsPrefix = fileContents?.slice(0, 1)?.toString()?.trim();
      if (!fileContentsPrefix || fileContentsPrefix[0] == "<") {
        // remove all newlines for hashing for better cross-OS hash compatibility (Issue #122)
        let fileContentsStr = fileContents.toString();
        let firstFour = fileContentsStr.trim().slice(0, 5);
        if(firstFour === "<svg " || firstFour === "<?xml") {
          fileContents = fileContentsStr.replace(/\r|\n/g, '');
        }
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

    if(this.options.urlFormat && typeof this.options.urlFormat === "function") {
      let hash;
      if(!this.options.statsOnly) {
        hash = this.getHash();
      }

      url = this.options.urlFormat({
        hash,
        src: this.src,
        width,
        format: outputFormat,
      }, this.options);
    } else {
      let hash = this.getHash();
      outputFilename = ImagePath.getFilename(hash, this.src, width, outputFormat, this.options);
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
  // Orientations 5 to 8 mean image is rotated ±90º (width/height are flipped)
  needsRotation(orientation) {
    // Sharp's metadata API exposes undefined EXIF orientations >8 as 1 (normal) but check anyways
    return orientation >= 5 && orientation <= 8;
  }

  // metadata so far: width, height, format
  // src is used to calculate the output file names
  getFullStats(metadata) {
    let results = [];
    let outputFormats = Image.getFormatsArray(this.options.formats, metadata.format || this.options.overrideInputFormat, this.options.svgShortCircuit);

    if (this.needsRotation(metadata.orientation)) {
      [metadata.height, metadata.width] = [metadata.width, metadata.height];
    }

    if(metadata.pageHeight) {
      // When the { animated: true } option is provided to sharp, animated
      // image formats like gifs or webp will have an inaccurate `height` value
      // in their metadata which is actually the height of every single frame added together.
      // In these cases, the metadata will contain an additional `pageHeight` property which
      // is the height that the image should be displayed at.
      metadata.height = metadata.pageHeight;
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

          if(this.options.svgShortCircuit === true) {
            break;
          } else {
            continue;
          }
        } else {
          debug("Skipping SVG output for %o: received raster input.", this.src);
          continue;
        }
      } else { // not outputting SVG (might still be SVG input though!)
        let widths = Image.getValidWidths(metadata.width, this.options.widths, metadata.format === "svg" && this.options.svgAllowUpscale, this.options.minimumThreshold);
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
        if(this.options.useCache && diskCache.isCached(stat.outputPath, input, !Util.isRequested(this.options.generatedVia))) {
          // Cached images already exist in output
          let contents;
          if(this.options.dryRun) {
            contents = this.getFileContents(stat.outputPath);
            stat.buffer = contents;
          }

          if(outputFormat === "svg" && this.options.svgCompressionSize === "br") {
            if(!contents) {
              contents = this.getFileContents(stat.outputPath);
            }
            stat.size = brotliSize.sync(contents);
          } else {
            stat.size = fs.statSync(stat.outputPath).size;
          }

          outputFilePromises.push(Promise.resolve(stat));
          continue;
        }

        let sharpInstance = sharpImage.clone();
        // Output images do not include orientation metadata (https://github.com/11ty/eleventy-img/issues/52)
        // Use sharp.rotate to bake orientation into the image (https://github.com/lovell/sharp/blob/v0.32.6/docs/api-operation.md#rotate):
        // > If no angle is provided, it is determined from the EXIF data. Mirroring is supported and may infer the use of a flip operation.
        // > The use of rotate without an angle will remove the EXIF Orientation tag, if any.
        if(this.options.fixOrientation || this.needsRotation(metadata.orientation)) {
          sharpInstance.rotate();
        }
        if(stat.width < metadata.width || (this.options.svgAllowUpscale && metadata.format === "svg")) {
          let resizeOptions = {
            width: stat.width
          };
          if(metadata.format !== "svg" || !this.options.svgAllowUpscale) {
            resizeOptions.withoutEnlargement = true;
          }

          sharpInstance.resize(resizeOptions);
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
            if(this.options.svgCompressionSize === "br") {
              stat.size = brotliSize.sync(hookResult);
            } else {
              stat.size = hookResult.length;
            }

            if(this.options.dryRun) {
              stat.buffer = Buffer.from(hookResult);
              outputFilePromises.push(Promise.resolve(stat));
            } else {
              outputFilePromises.push(
                fsp.mkdir(path.dirname(stat.outputPath), { recursive: true })
                  .then(() => fsp.writeFile(stat.outputPath, hookResult))
                  .then(() => stat)
              );
            }
          }
        } else { // not a format hook
          let sharpFormatOptions = this.getSharpOptionsForFormat(outputFormat);
          let hasFormatOptions = Object.keys(sharpFormatOptions).length > 0;
          if(hasFormatOptions || outputFormat && metadata.format !== outputFormat) {
            // https://github.com/lovell/sharp/issues/3680
            // Fix heic regression in sharp 0.33
            if(outputFormat === "heic" && !sharpFormatOptions.compression) {
              sharpFormatOptions.compression = "av1";
            }
            sharpInstance.toFormat(outputFormat, sharpFormatOptions);
          }

          if(!this.options.dryRun && stat.outputPath) {
            // Should never write when dryRun is true
            outputFilePromises.push(
              fsp.mkdir(path.dirname(stat.outputPath), { recursive: true })
                .then(() => sharpInstance.toFile(stat.outputPath))
                .then(info => {
                  stat.size = info.size;
                  return stat;
                })
            );
          } else {
            outputFilePromises.push(sharpInstance.toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
              stat.buffer = data;
              stat.size = info.size;
              return stat;
            }));
          }
        }

        if(stat.outputPath) {
          if(this.options.dryRun) {
            debug( "Generated %o", stat.url );
          } else {
            debug( "Wrote %o", stat.outputPath );
          }
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
let diskCache = new DiskCache();
let deferCounter = new DeferCounter();
let buildLogger = new BuildLogger();

/* Queue */
let processingQueue = new PQueue({
  concurrency: GLOBAL_OPTIONS.concurrency
});
processingQueue.on("active", () => {
  debug( `Concurrency: ${processingQueue.concurrency}, Size: ${processingQueue.size}, Pending: ${processingQueue.pending}` );
});

function logProcessedMessage(eleventyConfig, src, opts) {
  if(typeof eleventyConfig?.logger?.logWithOptions !== "function" || opts.transformOnRequest) {
    return;
  }

  let logSrc;
  if(Util.isRemoteUrl(src)) {
    logSrc = src;
  } else {
    if(path.isAbsolute(src)) {
      // convert back to relative url
      logSrc = TemplatePath.addLeadingDotSlash(path.relative(path.resolve("."), src));
    } else {
      logSrc = TemplatePath.addLeadingDotSlash(src);
    }
  }

  eleventyConfig.logger.logWithOptions({
    message: `Processing ${logSrc}${opts.generatedVia ? ` (${opts.generatedVia})` : ""}`,
    prefix: "[11ty/eleventy-img]"
  });
}

function setupLogger(eleventyConfig, opts) {
  if(typeof eleventyConfig?.logger?.logWithOptions !== "function" || Util.isRequested(opts?.generatedVia)) {
    return;
  }

  buildLogger.setupOnce(eleventyConfig, () => {
    // before build
    deferCounter.resetCount();
    memCache.resetCount();
    diskCache.resetCount();
  }, () => {
    // after build
    let [memoryCacheHit] = memCache.getCount();
    let [diskCacheHit, diskCacheMiss] = diskCache.getCount();
    // these are unique images, multiple requests to optimize the same image are de-duplicated
    let deferCount = deferCounter.getCount();

    let cachedCount = memoryCacheHit + diskCacheHit;
    let optimizedCount = diskCacheMiss + diskCacheHit + memoryCacheHit + deferCount;

    let msg = [];
    msg.push(`${optimizedCount} ${optimizedCount !== 1 ? "images" : "image"} optimized`);

    if(cachedCount > 0 || deferCount > 0) {
      let innerMsg = [];
      if(cachedCount > 0) {
        innerMsg.push(`${cachedCount} cached`);
      }
      if(deferCount > 0) {
        innerMsg.push(`${deferCount} deferred`);
      }
      msg.push(` (${innerMsg.join(", ")})`);
    }

    if(optimizedCount > 0 || cachedCount > 0 || deferCount > 0) {
      eleventyConfig?.logger?.logWithOptions({
        message: msg.join(""),
        prefix: "[11ty/eleventy-img]",
        color: "green",
      });
    }
  });
}

function queueImage(src, opts) {
  let eleventyConfig = opts?.eleventyConfig;
  if(opts?.eleventyConfig && {}.propertyIsEnumerable.call(opts, "eleventyConfig")) {
    delete opts.eleventyConfig;
    Util.addConfig(eleventyConfig, opts);
  }

  let img = new Image(src, opts);


  let key;
  let resolvedOptions = img.options;

  setupLogger(eleventyConfig, opts);

  if(opts.transformOnRequest) {
    deferCounter.increment(src);
  }

  if(resolvedOptions.useCache) {
    // we don’t know the output format yet, but this hash is just for the in memory cache
    key = img.getInMemoryCacheKey();
    let cached = memCache.get(key, !opts.transformOnRequest && !Util.isRequested(opts.generatedVia));
    if(cached) {
      return cached;
    }
  }

  logProcessedMessage(eleventyConfig, src, opts);

  debug("Processing %o (in-memory cache miss), options: %o", src, opts);

  let promise = processingQueue.add(async () => {
    if(typeof src === "string" && resolvedOptions.statsOnly) {
      if(Util.isRemoteUrl(src)) {
        if(opts.remoteImageMetadata?.width && opts.remoteImageMetadata?.height) {
          return img.getFullStats({
            width: opts.remoteImageMetadata.width,
            height: opts.remoteImageMetadata.height,
            format: opts.remoteImageMetadata.format, // only required if you want to use the "auto" format
            guess: true,
          });
        }

        // Fetch remote image to operate on it
        // `remoteImageMetadata` is no longer required for statsOnly on remote images
        src = await img.getInput();
      }

      // Local images
      try {
        let { width, height, type } = getImageSize(src);

        return img.getFullStats({
          width,
          height,
          format: type // only required if you want to use the "auto" format
        });
      } catch(e) {
        throw new Error(`Eleventy Image error (statsOnly): \`image-size\` on "${src}" failed. Original error: ${e.message}`);
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

module.exports.setupLogger = setupLogger;

const generateHTML = require("./src/generate-html.js");
module.exports.generateHTML = generateHTML;
module.exports.generateObject = generateHTML.generateObject;

const { eleventyWebcOptionsPlugin } = require("./src/webc-options-plugin.js");
module.exports.eleventyImagePlugin = eleventyWebcOptionsPlugin;
module.exports.eleventyImageWebcOptionsPlugin = eleventyWebcOptionsPlugin;

const { eleventyImageTransformPlugin } = require("./src/transform-plugin.js");
module.exports.eleventyImageTransformPlugin = eleventyImageTransformPlugin;

const { eleventyImageOnRequestDuringServePlugin } = require("./src/on-request-during-serve-plugin.js");
module.exports.eleventyImageOnRequestDuringServePlugin = eleventyImageOnRequestDuringServePlugin;
