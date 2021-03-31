const path = require("path");
const fs = require("fs-extra");
const { URL } = require("url");
const shorthash = require("short-hash");
const {default: PQueue} = require("p-queue");
const getImageSize = require("image-size");
const sharp = require("sharp");
const debug = require("debug")("EleventyImg");

const svgHook = require("./format-hooks/svg");

const {RemoteAssetCache, queue} = require("@11ty/eleventy-cache-assets");
const FileSizeCache = require("./filesize-cache");

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
  filenameFormat,
  useCache: true, // in-memory cache
  dryRun: false, // Also returns a buffer instance in the return object. Doesn’t write anything to the file system
};

const MIME_TYPES = {
  "jpeg": "image/jpeg",
  "webp": "image/webp",
  "png": "image/png",
  "svg": "image/svg+xml",
  "avif": "image/avif",
};

const FORMAT_ALIASES = {
  "jpg": "jpeg"
};

/* Size Cache */
let sizeCache = new FileSizeCache();

/* Queue */
let processingQueue = new PQueue({
  concurrency: globalOptions.concurrency
});
processingQueue.on("active", () => {
  debug( `Concurrency: ${processingQueue.concurrency}, Size: ${processingQueue.size}, Pending: ${processingQueue.pending}` );
});

function filenameFormat(id, src, width, format) { // and options
  if (width) {
    return `${id}-${width}.${format}`;
  }

  return `${id}.${format}`;
}

function getFormatsArray(formats) {
  if(formats && formats.length) {
    if(typeof formats === "string") {
      formats = formats.split(",");
    }

    formats = formats.map(format => {
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

    return formats;
  }

  return [];
}

function getValidWidths(originalWidth, widths = [], allowUpscale = false) {
  // replace any falsy values with the original width
  let valid = widths.map(width => !width || width === 'auto' ? originalWidth : width);

  // Convert strings to numbers, "400" (floats are not allowed in sharp)
  valid = valid.map(width => parseInt(width, 10));

  // filter out large widths if upscaling is disabled
  let filtered = valid.filter(width => allowUpscale || width <= originalWidth);

  // if the only valid width was larger than the original (and no upscaling), then use the original width
  if(valid.length > 0 && filtered.length === 0) {
    filtered.push(originalWidth);
  }

  // sort ascending
  return filtered.sort((a, b) => a - b);
}

function getFilename(src, width, format, options = {}) {
  let id = shorthash(src);
  if (typeof options.filenameFormat === "function") {
    let filename = options.filenameFormat(id, src, width, format, options);
    // if options.filenameFormat returns falsy, use fallback filename
    if(filename) {
      return filename;
    }
  }

  return filenameFormat(id, src, width, format, options);
}

function getUrlPath(dir, filename) {
  let src = path.join(dir, filename);
  return src.split(path.sep).join("/");
}

function getStats(src, format, urlPath, width, height, options = {}) {
  let url;
  let outputFilename;
  let outputExtension = options.extensions[format] || format;

  if(options.urlFormat && typeof options.urlFormat === "function") {
    let id = shorthash(src);
    url = options.urlFormat({
      id,
      src,
      width,
      format: outputExtension,
    }, options);
  } else {
    outputFilename = getFilename(src, width, outputExtension, options);
    url = getUrlPath(urlPath, outputFilename);
  }

  let stats = {
    format: format,
    width: width,
    height: height,
    url: url,
    sourceType: MIME_TYPES[format],
    srcset: `${url} ${width}w`,
    // Not available in stats* functions below
    // size // only after processing
  };

  if(outputFilename) {
    stats.filename = outputFilename; // optional
    stats.outputPath = path.join(options.outputDir, outputFilename); // optional
  }

  return stats;
}

// metadata so far: width, height, format
// src is used to calculate the output file names
function getFullStats(src, metadata, opts) {
  let options = Object.assign({}, globalOptions, opts);

  let results = [];
  let outputFormats = getFormatsArray(options.formats);

  for(let outputFormat of outputFormats) {
    if(!outputFormat || outputFormat === "auto") {
      outputFormat = metadata.format || options.overrideInputFormat;
    }
    if(!outputFormat || outputFormat === "auto") {
      throw new Error("When using statsSync or statsByDimensionsSync, `formats: [null | auto]` to use the native image format is not supported.");
    }

    if(outputFormat === "svg") {
      if((metadata.format || options.overrideInputFormat) === "svg") {
        let svgStats = getStats(src, "svg", options.urlPath, metadata.width, metadata.height, options);
        // metadata.size is only available with Buffer input (remote urls)
        if(metadata.size) {
          // Note this is unfair for comparison with raster formats because its uncompressed (no GZIP, etc)
          svgStats.size = metadata.size;
        }
        results.push(svgStats);

        if(options.svgShortCircuit) {
          break;
        } else {
          continue;
        }
      } else {
        debug("Skipping SVG output for %o: received raster input.", src);
        continue;
      }
    } else { // not SVG
      let widths = getValidWidths(metadata.width, options.widths, metadata.format === "svg" && options.svgAllowUpscale);
      for(let width of widths) {
        // Warning: if this is a guess via statsByDimensionsSync and that guess is wrong
        // The aspect ratio will be wrong and any height/widths returned will be wrong!
        let height = Math.floor(width * metadata.height / metadata.width);

        results.push(getStats(src, outputFormat, options.urlPath, width, height, options));
      }
    }
  }

  return transformRawFiles(results, outputFormats);
}

function transformRawFiles(files = [], formats = []) {
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

function getSharpOptionsForFormat(format, options) {
  if(format === "webp") {
    return options.sharpWebpOptions;
  } else if(format === "jpeg") {
    return options.sharpJpegOptions;
  } else if(format === "png") {
    return options.sharpPngOptions;
  } else if(format === "avif") {
    return options.sharpAvifOptions;
  }
  return {};
}

// src should be a file path to an image or a buffer
async function resizeImage(src, options = {}) {
  let sharpImage = sharp(src, Object.assign({
    failOnError: false
  }, options.sharpOptions));

  if(typeof src !== "string") {
    if(options.sourceUrl) {
      src = options.sourceUrl;
    } else {
      throw new Error("Expected options.sourceUrl in resizeImage when using Buffer as input.");
    }
  }

  // Must find the image format from the metadata
  // File extensions lie or may not be present in the src url!
  let metadata = await sharpImage.metadata();
  let outputFilePromises = [];

  let fullStats = getFullStats(src, metadata, options);
  for(let outputFormat in fullStats) {
    for(let stat of fullStats[outputFormat]) {
      let sharpInstance = sharpImage.clone();
      if(stat.width < metadata.width || (options.svgAllowUpscale && metadata.format === "svg")) {
        let resizeOptions = {
          width: stat.width
        };
        if(metadata.format !== "svg" || !options.svgAllowUpscale) {
          resizeOptions.withoutEnlargement = true;
        }
        sharpInstance.resize(resizeOptions);
      }

      if(!options.dryRun) {
        await fs.ensureDir(options.outputDir);
      }

      if(options.formatHooks && options.formatHooks[outputFormat]) {
        let hookResult = await options.formatHooks[outputFormat].call(stat, sharpInstance);
        if(hookResult) {
          stat.size = hookResult.length;
          if(options.dryRun) {
            stat.buffer = Buffer.from(hookResult);
            outputFilePromises.push(Promise.resolve(stat));
          } else {
            outputFilePromises.push(fs.writeFile(stat.outputPath, hookResult).then(() => stat));
          }
        }
      } else { // not a format hook
        let sharpFormatOptions = getSharpOptionsForFormat(outputFormat, options);
        let hasFormatOptions = Object.keys(sharpFormatOptions).length > 0;
        if(hasFormatOptions || outputFormat && metadata.format !== outputFormat) {
          sharpInstance.toFormat(outputFormat, sharpFormatOptions);
        }

        if(options.dryRun) {
          outputFilePromises.push(sharpInstance.toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
            stat.buffer = data;
            stat.size = info.size;
            return stat;
          }));
        } else {
          outputFilePromises.push(sharpInstance.toFile(stat.outputPath).then(info => {
            stat.size = info.size;
            return stat;
          }));
        }
      }
      debug( "Wrote %o", stat.outputPath );
    }
  }

  return Promise.all(outputFilePromises).then(files => transformRawFiles(files, Object.keys(fullStats)));
}

function isFullUrl(url) {
  try {
    new URL(url);
    return true;
  } catch(e) {
    // invalid url OR local path
    return false;
  }
}

function queueImage(src, opts) {
  let options = Object.assign({}, globalOptions, opts);

  if(!src) {
    throw new Error("`src` is a required argument to the eleventy-img utility (can be a string file path, string URL, or buffer).");
  }

  options.__originalSrc = src;

  let assetCache;
  let cacheOptions = Object.assign({
    duration: options.cacheDuration, // deprecated
    type: "buffer"
  }, options.cacheOptions);

  if(typeof src === "string" && isFullUrl(src)) {
    options.sourceUrl = src;

    assetCache = new RemoteAssetCache(src, cacheOptions.directory, cacheOptions);

    // valid only if asset cached file is still valid
    options.__validAssetCache = assetCache.isCacheValid(cacheOptions.duration);
  } else if(Buffer.isBuffer(src)) {
    options.sourceUrl = src.toString();
    options.__originalSize = src.length;
  } else {
    options.__originalSize = fs.statSync(src).size;
  }

  let cached = sizeCache.get(options);
  if(options.useCache && cached) {
    debug("Found cached, returning %o", cached);
    return cached;
  }

  let promise = processingQueue.add(async () => {
    let input;

    if(typeof src === "string" && isFullUrl(src)) {
      // fetch remote image
      if(queue) {
        // eleventy-cache-assets 2.0.4 and up
        input = await queue(src, () => assetCache.fetch());
      } else {
        // eleventy-cache-assets 2.0.3 and below
        input = await assetCache.fetch(cacheOptions);
      }
    } else {
      input = src;
    }

    return resizeImage(input, options);
  });

  sizeCache.add(options, promise);

  return promise;
}

module.exports = queueImage;

Object.defineProperty(module.exports, "concurrency", {
  get: function() {
    return processingQueue.concurrency;
  },
  set: function(concurrency) {
    processingQueue.concurrency = concurrency;
  },
});

/* `statsSync` doesn’t generate any files, but will tell you where
 * the asynchronously generated files will end up! This is useful
 * in synchronous-only template environments where you need the
 * image URLs synchronously but can’t rely on the files being in
 * the correct location yet.
 */
function statsSync(src, opts) {
  let dimensions = getImageSize(src);
  return getFullStats(src, dimensions, opts);
}

function statsByDimensionsSync(src, width, height, opts) {
  let dimensions = { width, height, guess: true };
  return getFullStats(src, dimensions, opts);
}

module.exports.statsSync = statsSync;
module.exports.statsByDimensionsSync = statsByDimensionsSync;
module.exports.getFormats = getFormatsArray;
module.exports.getWidths = getValidWidths;

const generateHTML = require("./generate-html");
module.exports.generateHTML = generateHTML;
module.exports.generateObject = generateHTML.generateObject;
