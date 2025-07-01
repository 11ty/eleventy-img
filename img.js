import PQueue from "p-queue";
import debugUtil from "debug";

import DeferCounter from "./src/defer-counter.js";
import BuildLogger from "./src/build-logger.js";
import Util from "./src/util.js";
import Image from "./src/image.js";
import DirectoryManager from "./src/directory-manager.js";
import { DEFAULTS as GLOBAL_OPTIONS } from "./src/global-options.js";
import { memCache, diskCache } from "./src/caches.js";

const debug = debugUtil("Eleventy:Image");

let deferCounter = new DeferCounter();
let buildLogger = new BuildLogger();
let directoryManager = new DirectoryManager();

/* Queue */
let processingQueue = new PQueue({
  concurrency: GLOBAL_OPTIONS.concurrency
});
processingQueue.on("active", () => {
  debug( `Concurrency: ${processingQueue.concurrency}, Size: ${processingQueue.size}, Pending: ${processingQueue.pending}` );
});

// TODO move this into build-logger.js
export function setupLogger(eleventyConfig, opts) {
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

function createImage(src, opts = {}) {
  let eleventyConfig = opts.eleventyConfig;

  if(opts?.eleventyConfig && {}.propertyIsEnumerable.call(opts, "eleventyConfig")) {
    delete opts.eleventyConfig;
    Util.addConfig(eleventyConfig, opts);
  }

  let img = Image.create(src, opts);

  img.setQueue(processingQueue);
  img.setBuildLogger(buildLogger);
  img.setDirectoryManager(directoryManager);

  setupLogger(eleventyConfig, opts);

  if(opts.transformOnRequest) {
    deferCounter.increment(src);
  }

  return img;
};

export default function queueImage(src, opts = {}) {
  if(src.constructor?.name === "UserConfig") {
    throw new Error(`Eleventy Image’s default export is not an Eleventy Plugin and cannot be used with \`eleventyConfig.addPlugin()\`. Use the \`eleventyImageTransformPlugin\` named export instead, like this: \`import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';\` or this: \`const { eleventyImageTransformPlugin } = require('@11ty/eleventy-img');\``);
  }

  let img = createImage(src, opts);
  return img.queue();
}

Object.defineProperty(queueImage, "concurrency", {
  get: function() {
    return processingQueue.concurrency;
  },
  set: function(concurrency) {
    processingQueue.concurrency = concurrency;
  },
});

// Support default export and named exports for backwards compat
import { default as ImagePath } from "./src/image-path.js";
import { default as ImageSize } from "image-size";
import { generateHTML, generateObject } from "./src/generate-html.js";

export {
  Util,
  Image,
  ImagePath,
  ImageSize,
  generateHTML,
  generateObject
};

Object.assign(queueImage, {
  Util,
  Image,
  ImagePath,
  ImageSize,
  generateHTML,
  generateObject,

  // Support default export only for backwards compat
  // TODO move folks to use Image.* instead
  statsSync: Image.statsSync,
  statsByDimensionsSync: Image.statsByDimensionsSync,
  getFormats: Image.getFormatsArray,
  getWidths: Image.getValidWidths,
  getHash: function(src, options) {
    let img = new Image(src, options);
    return img.getHash();
  },
});

// Eleventy Plugins (named exports only)
export {
  eleventyWebcOptionsPlugin as eleventyImagePlugin,
  eleventyWebcOptionsPlugin as eleventyImageWebcOptionsPlugin,
} from "./src/webc-options-plugin.js";

export { eleventyImageTransformPlugin } from "./src/transform-plugin.js";
export { eleventyImageOnRequestDuringServePlugin } from "./src/on-request-during-serve-plugin.js";
