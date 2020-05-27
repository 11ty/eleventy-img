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

  dir: {
    // the file system directory to write the image files to disk
    output: "./",
    // the directory in the image src URLs <img src="/img/MY_IMAGE.png">
    imgSrc: "/img/"
  },

  // eleventy-cache-assets
  // If a remote image URL, this is the amount of time before it downloads a new fresh copy from the remote server
  cacheDuration: "1d"
}
```

## Examples

> Requires `async`, make sure you’re using this in Liquid, 11ty.js, or Nunjucks (use an async shortcode).

### Specifying Output and Image Source Directories

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addNunjucksAsyncShortcode
  eleventyConfig.addJavaScriptFunction("myImage", async function(src, alt, outputFormat = "jpeg") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    // returns Promise
    let stats = await Image(src, {
      formats: [outputFormat],
      dir: {
        // Set the file system directory for saving images (_site/images/)
        output: "_site/",
        // Set the output img src directory (<img src="/images/MY_IMAGE.jpeg" alt="my pic">)
        imgSrc: "/images/"
      }
    });

    let props = stats[outputFormat].pop();

    return `<img src="${props.src}" width="${props.width}" height="${props.height}" alt="${alt}">`;
  });
};
```

### Output an Optimized Image with Width/Height Attributes

```js
const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addNunjucksAsyncShortcode
  eleventyConfig.addJavaScriptFunction("myImage", async function(src, alt, outputFormat = "jpeg") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    // returns Promise
    let stats = await Image(src, {
      formats: [outputFormat],
      // This uses the original image width
      widths: [null]
      // widths: [200] // output 200px maxwidth
      // widths: [200, null] // output 200px and original width
    });

    let props = stats[outputFormat].pop();

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
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myResponsiveImage from: ${src}`);
    }

    let stats = await Image(src, options);
    let lowestSrc = stats.jpeg[0];
    let sizes = "100vw"; // Make sure you customize this!

    // Iterate over formats and widths
    return `<picture>
      ${Object.values(stats).map(imageFormat => {
        return `  <source type="image/${imageFormat[0].format}" srcset="${imageFormat.map(entry => `${entry.src} ${entry.width}w`).join(", ")}" sizes="${sizes}">`;
      }).join("\n")}
        <img
          alt="${alt}"
          src="${lowestSrc.src}"
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
       sourceType: 'image/webp',
       src: '/img/9b186f9b.webp',
       srcset: '/img/9b186f9b.webp 1280w',
       outputPath: 'img/9b186f9b.webp',
       size: 213802 },
     { format: 'webp',
       width: 350,
       height: 233,
       sourceType: 'image/webp',
       src: '/img/9b186f9b-350.webp',
       srcset: '/img/9b186f9b-350.webp 350w',
       outputPath: 'img/9b186f9b-350.webp',
       size: 27288 } ],
  jpeg:
   [ { format: 'jpeg',
       width: 1280,
       height: 853,
       sourceType: 'image/jpg',
       src: '/img/9b186f9b.jpeg',
       srcset: '/img/9b186f9b.jpeg 1280w',
       outputPath: 'img/9b186f9b.jpeg',
       size: 276231 },
     { format: 'jpeg',
       width: 350,
       height: 233,
       sourceType: 'image/jpg',
       src: '/img/9b186f9b-350.jpeg',
       srcset: '/img/9b186f9b-350.jpeg 350w',
       outputPath: 'img/9b186f9b-350.jpeg',
       size: 29101 } ] }
```

### Change Global Plugin Concurrency

```js
const Image = require("@11ty/eleventy-img");
Image.concurrency = 4; // default is 10
```
