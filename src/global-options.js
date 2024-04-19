const path = require("path");

function getGlobalOptions(directories, options) {
  let globalOptions = Object.assign({
    packages: {
      image: require("../"),
    },
    outputDir: path.join(directories.output, options.urlPath || ""),
  }, options);

  globalOptions.directories = directories;

  return globalOptions;
}

module.exports = {
  getGlobalOptions,
};
