const eleventyImage = require("../img.js");
const Util = require("./util.js");

const ATTR_PREFIX = "eleventy:";

const ATTR = {
  IGNORE: `${ATTR_PREFIX}ignore`,
  WIDTHS: `${ATTR_PREFIX}widths`,
  FORMATS: `${ATTR_PREFIX}formats`,
  OUTPUT: `${ATTR_PREFIX}output`,
  OPTIONAL: `${ATTR_PREFIX}optional`,
};

function convertToPosthtmlNode(obj) {
  // node.tag
  // node.attrs
  // node.content

  let node = {};
  let [key] = Object.keys(obj);
  node.tag = key;

  if(Array.isArray(obj[key])) {
    node.content = obj[key].map(child => {
      return convertToPosthtmlNode(child);
    });
  } else {
    node.attrs = obj[key];
  }

  return node;
}

async function imageAttributesToPosthtmlNode(attributes, instanceOptions, globalPluginOptions) {
  if(!attributes.src) {
    throw new Error("Missing `src` attribute for `@11ty/eleventy-img`");
  }

  if(!globalPluginOptions) {
    throw new Error("Missing global defaults for `@11ty/eleventy-img`: did you call addPlugin?");
  }

  if(!instanceOptions) {
    instanceOptions = {};
  }

  // overrides global widths
  if(attributes[ATTR.WIDTHS]) {
    if(typeof attributes[ATTR.WIDTHS] === "string") {
      instanceOptions.widths = attributes[ATTR.WIDTHS].split(",").map(entry => parseInt(entry, 10));
      delete attributes[ATTR.WIDTHS];
    }
  }

  if(attributes[ATTR.FORMATS]) {
    if(typeof attributes[ATTR.FORMATS] === "string") {
      instanceOptions.formats = attributes[ATTR.FORMATS].split(",");
      delete attributes[ATTR.FORMATS];
    }
  }

  let options = Object.assign({}, globalPluginOptions, instanceOptions);
  Util.addConfig(globalPluginOptions.eleventyConfig, options);

  let metadata = await eleventyImage(attributes.src, options);
  cleanAttrs(attributes);

  let imageAttributes = Object.assign({}, globalPluginOptions.defaultAttributes, attributes);

  // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
  let obj = await eleventyImage.generateObject(metadata, imageAttributes);
  return convertToPosthtmlNode(obj);
}

function cleanAttrs(attrs = {}) {
  for(let key in attrs) {
    if(key.startsWith(ATTR_PREFIX)) {
      delete attrs?.[key];
    }
  }
}

function cleanTag(node) {
  // Delete all prefixed attributes
  cleanAttrs(node?.attrs);
}

function isIgnored(node) {
  return node?.attrs && node?.attrs?.[ATTR.IGNORE] !== undefined;
}

function isOptional(node, comparisonValue) {
  let attrValue = node?.attrs && node?.attrs?.[ATTR.OPTIONAL];
  if(attrValue !== undefined) {
    // if comparisonValue is not specified, return true
    if(comparisonValue === undefined) {
      return true;
    }
    return attrValue === comparisonValue;
  }
  return false;
}

function getOutputDirectory(node) {
  return node?.attrs?.[ATTR.OUTPUT];
}

module.exports = {
  imageAttributesToPosthtmlNode,
  cleanTag,
  isIgnored,
  isOptional,
  getOutputDirectory,
};
