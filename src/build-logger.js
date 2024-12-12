const path = require("node:path");
const { TemplatePath } = require("@11ty/eleventy-utils");

const Util = require("./util.js");

class BuildLogger {
  #eleventyConfig;

  constructor() {
    this.hasAssigned = false;
  }

  setupOnce(eleventyConfig, beforeCallback, afterCallback) {
    if(this.hasAssigned) {
      return;
    }

    this.hasAssigned = true;
    this.#eleventyConfig = eleventyConfig;

    eleventyConfig.on("eleventy.before", beforeCallback);
    eleventyConfig.on("eleventy.after", afterCallback);

    eleventyConfig.on("eleventy.reset", () => {
      this.hasAssigned = false;
      beforeCallback(); // we run this on reset because the before callback will have disappeared (as the config reset)
    });
  }

  getFriendlyImageSource(imageSource) {
    let logSrc;
    if(Util.isRemoteUrl(imageSource)) {
      logSrc = imageSource;
    } else {
      if(path.isAbsolute(imageSource)) {
        // convert back to relative url
        logSrc = TemplatePath.addLeadingDotSlash(path.relative(path.resolve("."), imageSource));
      } else {
        logSrc = TemplatePath.addLeadingDotSlash(imageSource);
      }
    }
    return logSrc;
  }

  log(message, options = {}, logOptions = {}) {
    if(typeof this.#eleventyConfig?.logger?.logWithOptions !== "function" || options.transformOnRequest) {
      return;
    }

    this.#eleventyConfig.logger.logWithOptions(Object.assign({
      message: `${message}${options.generatedVia ? ` (${options.generatedVia})` : ""}`,
      type: "log",
      prefix: "[11ty/eleventy-img]"
    }, logOptions));
  }

  error(message, options = {}, logOptions = {}) {
    logOptions.type = "error";
    logOptions.force = true;

    this.log(message, options, logOptions);
  }
}

module.exports = BuildLogger;
