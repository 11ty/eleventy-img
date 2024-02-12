const { getGlobalOptions } = require("./global-options.js");

function eleventyWebcOptionsPlugin(eleventyConfig, options = {}) {
  let eleventyDirectories;
  eleventyConfig.on("eleventy.directories", (dirs) => {
    eleventyDirectories = dirs;
  });

  // Notably, global options are not shared automatically with the `eleventyImageTransformPlugin` below.
  // Devs can pass in the same object to both if they want!
  eleventyConfig.addJavaScriptFunction("__private_eleventyImageConfigurationOptions", () => {
    return getGlobalOptions(eleventyDirectories, options);
  });
}

module.exports = {
  eleventyWebcOptionsPlugin,
};
