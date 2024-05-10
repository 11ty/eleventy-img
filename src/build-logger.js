class BuildLogger {
  constructor() {
    this.hasAssigned = false;
  }

  setupOnce(eleventyConfig, beforeCallback, afterCallback) {
    if(this.hasAssigned) {
      return;
    }

    this.hasAssigned = true;

    eleventyConfig.on("eleventy.before", beforeCallback);
    eleventyConfig.on("eleventy.after", afterCallback);

    eleventyConfig.on("eleventy.reset", () => {
      this.hasAssigned = false;
      beforeCallback(); // we run this on reset because the before callback will have disappeared (as the config reset)
    });
  }
}

module.exports = BuildLogger;
