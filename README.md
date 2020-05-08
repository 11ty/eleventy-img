# eleventy-img

Low level utility to perform build-time image transformations.

## Installation

```
npm install @11ty/eleventy-img
```

## Usage

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  eleventyConfig.addJavaScriptFunction("myResponsiveImage", function(src, options) {
    // returns Promise
    return Image(src, options);
  });
};
```

### Example, Output an Optimized Image with Width/Height Attributes

* Requires `async`, make sure you’re using this in Liquid, 11ty.js, or Nunjucks (use an async shortcode).

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  eleventyConfig.addJavaScriptFunction("myImage", async function(src, alt, outputFormat = "jpeg") {
    // returns Promise
    let stats = await Image(src, {
      formats: [outputFormat],
      widths: [null]
    });

    let props = stats[outputFormat].pop();

    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    return `<img src="${props.src}" width="${props.width}" height="${props.height}" alt="${alt}">`;
  });
};
```

### Example, Output Optimized Multi-Format, Multi-Size Responsive Images using <picture>

```js
eleventyConfig.addLiquidShortcode("myResponsiveImage", async function(src, alt, options) {
    let stats = await Image(src, options);
    let lowestSrc = stats.jpeg[0];
    let sizes = "100vw"; // Make sure you customize this!

    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    return `<picture>
  <source type="image/webp" srcset="${stats.webp.map(entry => `${entry.url} ${entry.width}w`).join(", ")}" sizes="${sizes}">
  <source type="image/jpeg" srcset="${stats.jpeg.map(entry => `${entry.url} ${entry.width}w`).join(", ")}" sizes="${sizes}">
  <img
    alt="${alt}"
    src="${lowestSrc.url}"
    width="${lowestSrc.width}"
    height="${lowestSrc.height}">
</picture>`;
  });
```

### Full Option List

```js
{
  // Array of widths
  // Optional: use falsy value to fall back to native image size
  widths: [null],

  // Pass any format supported by sharp
  formats: ["webp", "jpeg"], //"png"

  // the directory in the image URLs <img src="/img/MY_IMAGE.png">
  urlPath: "/img/",

  // the path to the directory on the file system to write the image files to disk
  outputDir: "img/"
}
```

### Sample return object

Use this object to generate your responsive image markup.

```js
{ webp:
   [ { format: 'webp',
       width: 1280,
       height: 853,
       url: '/img/9b186f9b.webp',
       sourceType: 'image/webp',
       srcset: '/img/9b186f9b.webp 1280w',
       outputPath: 'img/9b186f9b.webp',
       size: 213802 },
     { format: 'webp',
       width: 350,
       height: 233,
       url: '/img/9b186f9b-350.webp',
       sourceType: 'image/webp',
       srcset: '/img/9b186f9b-350.webp 350w',
       outputPath: 'img/9b186f9b-350.webp',
       size: 27288 } ],
  jpeg:
   [ { format: 'jpeg',
       width: 1280,
       height: 853,
       url: '/img/9b186f9b.jpeg',
       sourceType: 'image/jpg',
       srcset: '/img/9b186f9b.jpeg 1280w',
       outputPath: 'img/9b186f9b.jpeg',
       size: 276231 },
     { format: 'jpeg',
       width: 350,
       height: 233,
       url: '/img/9b186f9b-350.jpeg',
       sourceType: 'image/jpg',
       srcset: '/img/9b186f9b-350.jpeg 350w',
       outputPath: 'img/9b186f9b-350.jpeg',
       size: 29101 } ] }
```

### Change Global Plugin Concurrency

```js
const Image = require("@11ty/eleventy-img");
Image.concurrency = 4; // default is 10
```
