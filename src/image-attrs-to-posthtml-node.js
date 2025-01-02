const eleventyImage = require("../img.js");
const Util = require("./util.js");

const ATTR_PREFIX = "eleventy:";

const CHILDREN_OBJECT_KEY = "@children";

const ATTR = {
  IGNORE: `${ATTR_PREFIX}ignore`,
  WIDTHS: `${ATTR_PREFIX}widths`,
  FORMATS: `${ATTR_PREFIX}formats`,
  OUTPUT: `${ATTR_PREFIX}output`,
  OPTIONAL: `${ATTR_PREFIX}optional`,
  PICTURE: `${ATTR_PREFIX}pictureattr:`,
};

function getPictureAttributes(attrs = {}) {
  let pictureAttrs = {};
  for(let key in attrs) {
    // <img eleventy:pictureattr:NAME="VALUE"> hoists to `<picture NAME="VALUE">
    // e.g. <img eleventy:pictureattr:class="outer"> hoists to <picture class="outer">
    if(key.startsWith(ATTR.PICTURE)) {
      pictureAttrs[key.slice(ATTR.PICTURE.length)] = attrs[key];
    }
  }
  return pictureAttrs;
}

function convertToPosthtmlNode(obj) {
  // node.tag
  // node.attrs
  // node.content

  let node = {};
  let [key] = Object.keys(obj);
  node.tag = key;

  let children = obj[key]?.[CHILDREN_OBJECT_KEY];
  let attributes = {};
  for(let attrKey in obj[key]) {
    if(attrKey !== CHILDREN_OBJECT_KEY) {
      attributes[attrKey] = obj[key][attrKey];
    }
  }
  node.attrs = attributes;

  if(Array.isArray(children)) {
    node.content = obj[key]?.[CHILDREN_OBJECT_KEY]
      .filter(child => Boolean(child))
      .map(child => {
        return convertToPosthtmlNode(child);
      });
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

  let pictureAttributes = getPictureAttributes(attributes);

  cleanAttrs(attributes);

  let imageAttributes = Object.assign({}, globalPluginOptions.defaultAttributes, attributes);

  // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
  let obj = await eleventyImage.generateObject(metadata, imageAttributes, pictureAttributes);
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
