const DEFAULT_ATTRIBUTES = {
  // loading: "lazy",
  // decoding: "async",
};

const LOWSRC_FORMAT_PREFERENCE = ["jpeg", "png", "svg", "webp", "avif"];

function objectToAttributes(obj, filteredAttributes = []) {
  return Object.entries(obj).filter(entry => filteredAttributes.indexOf(entry[0]) === -1).map(entry => {
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

  let formats = Object.keys(metadata);
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
      lowsrc = metadata[lowsrcFormat];
      break;
    }
  }

  if(!lowsrc || !lowsrc.length) {
    throw new Error(`Could not find the lowest <img> source for responsive markup for ${attributes.src}`);
  }

  attributes.src = lowsrc[0].url;
  attributes.width = lowsrc[lowsrc.length - 1].width;
  attributes.height = lowsrc[lowsrc.length - 1].height;

  let attributesWithoutSizes = objectToAttributes(attributes, ["sizes"]);
  let imgMarkup = `<img ${attributesWithoutSizes}>`;

  // <img>: one format and one size
  if(entryCount === 1) {
    return imgMarkup;
  }

  // <img srcset>: one format and multiple sizes
  if(formats.length === 1) { // implied entryCount > 1
    let sizesAttr = attributes.sizes ? ` sizes="${attributes.sizes}"` : "";
    // `sizes` was filtered out in objectToAttributes above
    let srcsetAttr = ` srcset="${Object.values(lowsrc).map(entry => entry.srcset).join(", ")}"`;
    return `<img ${attributesWithoutSizes}${srcsetAttr}${sizesAttr}>`;
  }

  let isInline = options.whitespaceMode !== "block";
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
