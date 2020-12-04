// TODO use `srcsethelp` project to improve output (blurry lowsrc?)

const path = require("path");
const fs = require("fs-extra");
const { URL } = require("url");

const shorthash = require("short-hash");
const {default: PQueue} = require("p-queue");
const imageSize = require("image-size");
const sharp = require("sharp");
const debug = require("debug")("EleventyImg");

const CacheAsset = require("@11ty/eleventy-cache-assets");

const globalOptions = {
  src: null,
  widths: [null],
  formats: ["webp", "jpeg"], // "png", "svg"
  concurrency: 10,
  urlPath: "/img/",
  outputDir: "img/",
  svgShortCircuit: false, // skip raster formats if SVG input is found
  svgAllowUpscale: true,
  // overrideInputFormat: false, // internal, used to force svg output in statsSync et al
  sharpOptions: {}, // options passed to the Sharp constructor
  cacheDuration: "1d", // deprecated, use cacheOptions.duration
  cacheOptions: {
    // duration: "1d",
    // directory: ".cache",
    // removeUrlQueryParams: false,
    // fetchOptions: {},
  },
  filenameFormat: function (id, src, width, format, options) {
    if (width) {
      return `${id}-${width}.${format}`;
    }

    return `${id}.${format}`;
  },
};

const MIME_TYPES = {
  "jpeg": "image/jpeg",
  "webp": "image/webp",
  "png": "image/png",
  "svg": "image/svg+xml",
};

function getFormatsArray(formats) {
  if(formats && formats.length) {
    if(typeof formats === "string") {
      formats = formats.split(",");
    }

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

function getFilename(src, width, format, options = {}) {
  let id = shorthash(src);
  if (typeof options.filenameFormat === 'function') {
    return options.filenameFormat(id, src, width, format, options);
  }

  if (width) {
    return `${id}-${width}.${format}`;
  }

  return `${id}.${format}`;
}

function getStats(src, format, urlPath, width, height, includeWidthInFilename, options = {}) {
  let outputFilename = getFilename(src, includeWidthInFilename ? width : false, format, options);
  let url = path.join(urlPath, outputFilename);

  return {
    format: format,
    width: width,
    height: height,
    filename: outputFilename,
    outputPath: path.join(options.outputDir, outputFilename),
    url: url,
    sourceType: MIME_TYPES[format],
    srcset: `${url} ${width}w`,
    // size // only after processing
  };
}

// metadata so far: width, height, format
function getFullStats(src, metadata, opts) {
  let options = Object.assign({}, globalOptions, opts);

  let results = [];
  let outputFormats = getFormatsArray(options.formats);

  for(let outputFormat of outputFormats) {
    if(!outputFormat) {
      outputFormat = metadata.format || options.overrideInputFormat;
    }
    if(!outputFormat) {
      throw new Error("When using statsSync or statsByDimensionsSync, `formats: [null]` to use the native image format is not supported.");
    }

    if(outputFormat === "svg") {
      if((metadata.format || options.overrideInputFormat) === "svg") {
        let svgStats = getStats(src, "svg", options.urlPath, metadata.width, metadata.height, false, options);
        // Warning this is unfair for comparison because its uncompressed (no GZIP, etc)
        svgStats.size = metadata.size;
        results.push(svgStats);

        if(options.svgShortCircuit) {
          break;
        } else {
          continue;
        }
      } else {
        debug("Skipping: %o asked for SVG output but received raster input.", src);
        continue;
      }
    } else { // not SVG
      let hasAtLeastOneValidMaxWidth = false;
      for(let width of options.widths) {
        let includeWidthInFilename = !!width;
        let height;
        if(hasAtLeastOneValidMaxWidth && (!width ||
          (width > metadata.width &&
            (!options.svgAllowUpscale || metadata.format !== "svg")
          )
        )) {
          continue;
        }

        if(!width) {
          width = metadata.width;
          height = metadata.height;
          hasAtLeastOneValidMaxWidth = true;
        } else {
          if(width >= metadata.width) {
            if(!options.svgAllowUpscale || metadata.format !== "svg") {
              width = metadata.width;
            }
            includeWidthInFilename = false;
            hasAtLeastOneValidMaxWidth = true;
          }
          height = Math.floor(width * metadata.height / metadata.width);
        }

        results.push(getStats(src, outputFormat, options.urlPath, width, height, includeWidthInFilename, options));
      }
    }
  }

  return transformRawFiles(results, outputFormats);
}

function transformRawFiles(files = [], formats = []) {
  let byType = {};
  for(let format of formats) {
    byType[format] = [];
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
      if(outputFormat === "svg") {
        let sharpInput = sharpImage.options.input;
        let svgBuffer = sharpInput.buffer;
        if(!svgBuffer) { // local file system
          outputFilePromises.push(fs.copyFile(sharpInput.file, stat.outputPath).then(() => stat));
        } else {
          outputFilePromises.push(fs.writeFile(stat.outputPath, svgBuffer.toString("utf-8"), {
            encoding: "utf8"
          }).then(() => stat));
        }
      } else { // not SVG
        let imageFormat = sharpImage.clone();
        if(outputFormat && metadata.format !== outputFormat) {
          imageFormat.toFormat(outputFormat);
        }

        if(stat.width < metadata.width || (options.svgAllowUpscale && metadata.format === "svg")) {
          let resizeOptions = {
            width: stat.width
          };
          if(metadata.format !== "svg" || !options.svgAllowUpscale) {
            resizeOptions.withoutEnlargement = true;
          }
          imageFormat.resize(resizeOptions);
        }

        outputFilePromises.push(imageFormat.toFile(stat.outputPath).then(data => {
          stat.size = data.size;
          return stat;
        }));

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

/* Combine it all together */
async function image(src, opts) {
  if(!src) {
    throw new Error("`src` is a required argument to the eleventy-img utility (can be a string file path, string URL, or buffer).");
  }

  if(typeof src === "string" && isFullUrl(src)) {
    // fetch remote image
    let buffer = await await CacheAsset(src, Object.assign({
      duration: opts.cacheDuration,
      type: "buffer"
    }, opts.cacheOptions));

    opts.sourceUrl = src;
    return resizeImage(buffer, opts);
  }

  // use file path to local image
  return resizeImage(src, opts);
}

/* Queue */
let queue = new PQueue({
  concurrency: globalOptions.concurrency
});
queue.on("active", () => {
  debug( `Concurrency: ${queue.concurrency}, Size: ${queue.size}, Pending: ${queue.pending}` );
});

async function queueImage(src, opts) {
  let options = Object.assign({}, globalOptions, opts);

  // create the output dir
  await fs.ensureDir(options.outputDir);

  return queue.add(() => image(src, options));
}

module.exports = queueImage;

Object.defineProperty(module.exports, "concurrency", {
  get: function() {
    return queue.concurrency;
  },
  set: function(concurrency) {
    queue.concurrency = concurrency;
  },
});

/* `statsSync` doesn’t generate any files, but will tell you where
 * the asynchronously generated files will end up! This is useful
 * in synchronous-only template environments where you need the
 * image URLs synchronously but can’t rely on the files being in
 * the correct location yet.
 */
function statsSync(src, opts) {
  let dimensions = imageSize(src);
  return getFullStats(src, dimensions, opts);
}

function statsByDimensionsSync(src, width, height, opts) {
  let dimensions = { width, height };
  return getFullStats(src, dimensions, opts);
}

module.exports.statsSync = statsSync;
module.exports.statsByDimensionsSync = statsByDimensionsSync;
module.exports.getFormats = getFormatsArray;
