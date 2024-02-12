const path = require("path");

function getGlobalOptions(eleventyDirectories, options) {
  let globalOptions = Object.assign({
    packages: {
      image: require("../"),
    },
    outputDir: path.join(eleventyDirectories.output, options.urlPath || ""),
  }, options);

  globalOptions.eleventyDirectories = eleventyDirectories;

  return globalOptions;
}

module.exports = {
  getGlobalOptions,
};
