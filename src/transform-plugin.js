const path = require("path");
const { imageAttributesToPosthtmlNode, getOutputDirectory, cleanTag, isIgnored } = require("./image-attrs-to-posthtml-node.js");
const { getGlobalOptions } = require("./global-options.js");

function isFullUrl(url) {
  try {
    new URL(url);
    return true;
  } catch(e) {
    return false;
  }
}

function normalizeImageSource({ inputPath, contentDir }, src) {
  if(isFullUrl(src)) {
    return src;
  }

  if(!path.isAbsolute(src)) {
    // if the image src is relative, make it relative to the template file (inputPath);
    let dir = path.dirname(inputPath);
    return path.join(dir, src);
  }

  // if the image src is absolute, make it relative to the content directory.
  return path.join(contentDir, src);
}

function transformTag(context, node, opts) {
  let originalSource = node.attrs.src;
  let { inputPath, outputPath, url } = context.page;

  node.attrs.src = normalizeImageSource({
    inputPath,
    contentDir: opts.eleventyDirectories.input,
  }, originalSource);

  let instanceOptions = {};

  let outputDirectory = getOutputDirectory(node);
  if(outputDirectory) {
    if(path.isAbsolute(outputDirectory)) {
      instanceOptions = {
        outputDir: path.join(opts.eleventyDirectories.output, outputDirectory),
        urlPath: outputDirectory,
      };
    } else {
      instanceOptions = {
        outputDir: path.join(opts.eleventyDirectories.output, url, outputDirectory),
        urlPath: path.join(url, outputDirectory),
      };
    }
  } else if(opts.urlPath) {
    // do nothing, user has specified directories in the plugin options.
  } else if(path.isAbsolute(originalSource)) {
    // if the path is an absolute one (relative to the content directory) write to a global output directory to avoid duplicate writes for identical source images.
    instanceOptions = {
      outputDir: path.join(opts.eleventyDirectories.output, "/img/"),
      urlPath: "/img/",
    };
  } else {
    // If original source is a relative one, this colocates images to the template output.
    instanceOptions = {
      outputDir: path.dirname(outputPath),
      urlPath: url,
    };
  }

  // returns promise
  return imageAttributesToPosthtmlNode(node.attrs, instanceOptions, opts).then(obj => {
    // TODO how to assign attributes to `<picture>` only
    // Wipe out attrs just in case this is <picture>
    node.attrs = {};

    Object.assign(node, obj);
  });
}

function eleventyImageTransformPlugin(eleventyConfig, options = {}) {
  options = Object.assign({
    extensions: "html",
  }, options);

  let eleventyDirectories;
  eleventyConfig.on("eleventy.directories", (dirs) => {
    eleventyDirectories = dirs;
  });

  function posthtmlPlugin(context) {
    // Notably, global options are not shared automatically with the WebC `eleventyImagePlugin` above.
    // Devs can pass in the same object to both if they want!
    let opts =  getGlobalOptions(eleventyDirectories, options);

    return (tree) => {
      let promises = [];
      tree.match({ tag: 'img' }, (node) => {
        if(isIgnored(node)) {
          cleanTag(node);
        } else {
          promises.push(transformTag(context, node, opts));
        }

        return node;
      });

      return Promise.all(promises).then(() => tree);
    };
  }

  if(!eleventyConfig.htmlTransformer || !("addPosthtmlPlugin" in eleventyConfig.htmlTransformer)) {
    throw new Error("[@11ty/eleventy-img] `eleventyImageTransformPlugin` is not compatible with this version of Eleventy. You will need to use v3.0.0 or newer.");
  }

  eleventyConfig.htmlTransformer.addPosthtmlPlugin(options.extensions, posthtmlPlugin, {
    priority: -1, // we want this to go before <base> or inputpath to url
  });
}

module.exports = {
  eleventyImageTransformPlugin,
};
