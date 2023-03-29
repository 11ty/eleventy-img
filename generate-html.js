const { escapeAttribute } = require("entities/lib/escape.js");

const DEFAULT_ATTRIBUTES = {
  // loading: "lazy",
  // decoding: "async",
};

const LOWSRC_FORMAT_PREFERENCE = ["jpeg", "png", "svg", "webp", "avif"];

/*
  Returns:
  e.g. { img: { alt: "", src: "" }
  e.g. { picture: [
    { source: { srcset: "", sizes: "" } },
    { source: { srcset: "", sizes: "" } },
    { img: { alt: "", src: "" } },
  ]}
 */
function generateObject(metadata, attributes = {}) {
  attributes = Object.assign({}, DEFAULT_ATTRIBUTES, attributes);
  // The attributes.src gets overwritten later on. Save it here to make the error outputs less cryptic.
  const originalSrc = attributes.src;

  if(attributes.alt === undefined) {
    // You bet we throw an error on missing alt (alt="" works okay)
    throw new Error(`Missing \`alt\` attribute on eleventy-img shortcode from: ${originalSrc}`);
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
    if((format in metadata) && metadata[format].length) {
      lowsrcFormat = format;
      lowsrc = metadata[lowsrcFormat];
      break;
    }
  }

  // Handle if empty intersection between format and LOWSRC_FORMAT_PREFERENCE (e.g. gif)
  // If there’s only one format in the results, use that
  if(!lowsrc && formats.length === 1) {
    lowsrcFormat = formats[0];
    lowsrc = metadata[lowsrcFormat];
  }

  if(!lowsrc || !lowsrc.length) {
    throw new Error(`Could not find the lowest <img> source for responsive markup for ${originalSrc}`);
  }

  attributes.src = lowsrc[0].url;
  attributes.width = lowsrc[lowsrc.length - 1].width;
  attributes.height = lowsrc[lowsrc.length - 1].height;

  let attributesWithoutSizes = Object.assign({}, attributes);
  delete attributesWithoutSizes.sizes;

  // <img>: one format and one size
  if(entryCount === 1) {
    return {
      "img": attributesWithoutSizes
    };
  }

  let missingSizesErrorMessage = `Missing \`sizes\` attribute on eleventy-img shortcode from: ${originalSrc || attributes.src}`;

  // <img srcset>: one format and multiple sizes
  if(formats.length === 1) { // implied entryCount > 1
    if(entryCount > 1 && !attributes.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w` unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesErrorMessage);
    }

    let imgAttributes = Object.assign({}, attributesWithoutSizes);
    let srcsetAttrValue = Object.values(lowsrc).map(entry => entry.srcset).join(", ");
    imgAttributes.srcset = srcsetAttrValue;
    imgAttributes.sizes = attributes.sizes;

    return {
      img: imgAttributes
    };
  }

  let children = [];
  values.filter(imageFormat => {
    return imageFormat.length > 0 && (lowsrcFormat !== imageFormat[0].format || imageFormat.length !== 1);
  }).forEach(imageFormat => {
    if(imageFormat.length > 1 && !attributes.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w` unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesErrorMessage);
    }

    let sourceAttrs = {
      type: imageFormat[0].sourceType,
      srcset: imageFormat.map(entry => entry.srcset).join(", "),
    };

    if(attributes.sizes) {
      sourceAttrs.sizes = attributes.sizes;
    }

    children.push({
      "source": sourceAttrs
    });
  });

  children.push({
    "img": attributesWithoutSizes
  });

  return {
    "picture": children
  };
}

function mapObjectToHTML(tagName, attrs = {}) {
  let attrHtml = Object.entries(attrs).map(entry => {
    let [key, value] = entry;
    if(key === "alt") {
      return `${key}="${value ? escapeAttribute(value) : ""}"`;
    }

    return `${key}="${value}"`;
  }).join(" ");

  return `<${tagName}${attrHtml ? ` ${attrHtml}` : ""}>`;
}

function generateHTML(metadata, attributes = {}, options = {}) {
  let isInline = options.whitespaceMode !== "block";
  let markup = [];
  let obj = generateObject(metadata, attributes, options);
  for(let tag in obj) {
    if(!Array.isArray(obj[tag])) {
      markup.push(mapObjectToHTML(tag, obj[tag]));
    } else {
      markup.push(`<${tag}>`);
      for(let child of obj[tag]) {
        let childTagName = Object.keys(child)[0];
        markup.push((!isInline ? "  " : "") + mapObjectToHTML(childTagName, child[childTagName]));
      }
      markup.push(`</${tag}>`);
    }
  }
  return markup.join(!isInline ? "\n" : "");
}

module.exports = generateHTML;
module.exports.generateObject = generateObject;
