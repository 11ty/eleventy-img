const path = require("path");

function getGlobalOptions(directories, options, via) {
  let globalOptions = Object.assign({
    packages: {
      image: require("../"),
    },
    outputDir: path.join(directories.output, options.urlPath || ""),
  }, options);

  globalOptions.directories = directories;
  globalOptions.generatedVia = via;

  return globalOptions;
}

module.exports = {
  getGlobalOptions,
};
