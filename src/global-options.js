const path = require("path");

function getGlobalOptions(eleventyConfig, options, via) {
  let directories = eleventyConfig.directories;
  let globalOptions = Object.assign({
    packages: {
      image: require("../"),
    },
    outputDir: path.join(directories.output, options.urlPath || ""),
  }, options);

  // globalOptions.eleventyConfig = eleventyConfig;
  globalOptions.directories = directories;
  globalOptions.generatedVia = via;

  Object.defineProperty(globalOptions, "eleventyConfig", {
    value: eleventyConfig,
    enumerable: false,
  });

  return globalOptions;
}

module.exports = {
  getGlobalOptions,
};
