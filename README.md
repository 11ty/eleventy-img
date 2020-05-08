# eleventy-img

Low level utility to perform build-time image transformations.

## Features

* Optimizes and resizes images for you, automatically. Can output multiple image sizes. Keeps original image aspect ratios intact. Never upscales images larger than original size.
* Can output multiple formats (you’ll probably use a combination of `webp`, `png`, `jpeg` but works with any supported image type in `sharp`).
* Makes it easy to add `width` and `height` attributes for [proper aspect ratio mapping](https://developer.mozilla.org/en-US/docs/Web/Media/images/aspect_ratio_mapping).
* Download remote images and cache them locally using [`eleventy-cache-assets`](https://github.com/11ty/eleventy-cache-assets). Make your HTML point to local images so you won’t see broken image URLs in the future.
* Control concurrency of image processing.

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

### Options List

Defaults values are shown:

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
  outputDir: "img/",

  // eleventy-cache-assets
  // If a remote image URL, this is the amount of time before it downloads a new fresh copy from the remote server
  cacheDuration: "1d"
}
```

## Examples

### Output an Optimized Image with Width/Height Attributes

* Requires `async`, make sure you’re using this in Liquid, 11ty.js, or Nunjucks (use an async shortcode).

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addNunjucksAsyncShortcode
  eleventyConfig.addJavaScriptFunction("myImage", async function(src, alt, outputFormat = "jpeg") {
    // returns Promise
    let stats = await Image(src, {
      formats: [outputFormat],
      // This uses the original image width
      widths: [null]
      // widths: [200] // output 200px maxwidth
      // widths: [200, null] // output 200px and original width
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

### Output Optimized Multi-Format, Multi-Size Responsive Images using `<picture>`

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addNunjucksAsyncShortcode
  eleventyConfig.addJavaScriptFunction("myResponsiveImage", async function(src, alt, options) {
      let stats = await Image(src, options);
      let lowestSrc = stats.jpeg[0];
      let sizes = "100vw"; // Make sure you customize this!

      if(alt === undefined) {
        // You bet we throw an error on missing alt (alt="" works okay)
        throw new Error(`Missing \`alt\` on myResponsiveImage from: ${src}`);
      }

      // Iterate over formats and widths
      return `<picture>
        ${Object.values(stats).map(imageFormat => {
          return `  <source type="image/${imageFormat[0].format}" srcset="${imageFormat.map(entry => `${entry.url} ${entry.width}w`).join(", ")}" sizes="${sizes}">`;
        }).join("\n")}
  <img
    alt="${alt}"
    src="${lowestSrc.url}"
    width="${lowestSrc.width}"
    height="${lowestSrc.height}">
</picture>`;
    });
};
```

## Sample return object

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
