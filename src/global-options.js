const path = require("path");
const Util = require("./util.js");

function getGlobalOptions(eleventyConfig, options, via) {
  let directories = eleventyConfig.directories;
  let globalOptions = Object.assign({
    packages: {
      image: require("../"),
    },
    outputDir: path.join(directories.output, options.urlPath || ""),
  }, options);

  globalOptions.directories = directories;
  globalOptions.generatedVia = via;

  Util.addConfig(eleventyConfig, globalOptions);

  return globalOptions;
}

module.exports = {
  getGlobalOptions,
};
