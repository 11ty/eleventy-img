const Image = require("./img");

const DEFAULT_ATTRIBUTES = {
  // loading: "lazy",
  // decoding: "async",
};

const LOWSRC_FORMAT_PREFERENCE = ["jpeg", "png", "svg", "webp", "avif"];

function objectToAttributes(obj) {
  return Object.entries(obj).map(entry => {
    let [key, value] = entry;
    return `${key}="${value}"`;
  }).join(" ");
}

function generateHTML(metadata, attributes = {}) {
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
    throw new Error("No image results found from `eleventy-img` in generateHTML. Expects a results object like the one documented at: https://www.11ty.dev/docs/plugins/image/#usage.");
  }

  let lowsrc;
  for(let format of LOWSRC_FORMAT_PREFERENCE) {
    if(format in metadata) {
      lowsrc = metadata[format][0];
      break;
    }
  }

  let imgMarkup = `<img src="${lowsrc.url}" width="${lowsrc.width}" height="${lowsrc.height}" ${objectToAttributes(attributes)}>`;

  // No need for <picture> if only one format and one size is in play
  // TODO improvement if one format and multiple sizes using <img srcset>
  if(entryCount === 1) {
    return imgMarkup;
  }

  return `<picture>
  ${values.map(imageFormat => {
    return `<source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}"${attributes.sizes ? ` sizes="${attributes.sizes}"` : ""}>`;
  }).join("\n  ")}
  ${imgMarkup}
</picture>`;
}

module.exports = generateHTML;
