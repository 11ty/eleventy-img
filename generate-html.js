const Image = require("./img");

const DEFAULT_ATTRIBUTES = {
  // loading: "lazy",
  // decoding: "async",
};

const LOWSRC_FORMAT_PREFERENCE = ["jpeg", "png", "svg", "webp", "avif"];

function objectToAttributes(obj) {
  return Object.entries(obj).filter(entry => entry[0] != 'sizes').map(entry => {
    let [key, value] = entry;
    return `${key}="${value}"`;
  }).join(" ");
}

function generateHTML(metadata, attributes = {}, options = {}) {
  attributes = Object.assign({}, DEFAULT_ATTRIBUTES, attributes);

  if(attributes.alt === undefined) {
    // You bet we throw an error on missing alt (alt="" works okay)
    throw new Error(`Missing \`alt\` on eleventy-img shortcode from: ${attributes.src}`);
  }

  let values = Object.values(metadata);
  let entryCount = 0;
  for(let imageFormat of values) {
    entryCount += imageFormat.length;
  }

  if(entryCount === 0) {
    throw new Error("No image results found from `eleventy-img` in generateHTML. Expects a results object similar to: https://www.11ty.dev/docs/plugins/image/#usage.");
  }

  let lowsrc;
  let lowsrcFormat;
  for(let format of LOWSRC_FORMAT_PREFERENCE) {
    if(format in metadata) {
      lowsrcFormat = format;
      lowsrc = metadata[lowsrcFormat][0];
      break;
    }
  }

  if(!lowsrc) {
    throw new Error(`Could not find the lowest <img> source for responsive markup for ${attributes.src}`);
  }

  let imgMarkup = `<img src="${lowsrc.url}" width="${lowsrc.width}" height="${lowsrc.height}" ${objectToAttributes(attributes)}>`;

  // No need for <picture> if only one format and one size is in play
  // TODO improvement if one format and multiple sizes using <img srcset>
  if(entryCount === 1) {
    return imgMarkup;
  }

  let isInline = options.whitespaceMode === "inline";
  let markup = ["<picture>"];
  values.filter(imageFormat => {
    return lowsrcFormat !== imageFormat[0].format || imageFormat.length !== 1;
  }).forEach(imageFormat => {
    markup.push(`${!isInline ? "  " : ""}<source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}"${attributes.sizes ? ` sizes="${attributes.sizes}"` : ""}>`);
  });
  markup.push(`${!isInline ? "  " : ""}${imgMarkup}`);
  markup.push("</picture>");

  return markup.join(!isInline ? "\n" : "");
}

module.exports = generateHTML;
