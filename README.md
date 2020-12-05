# eleventy-img

Low level utility to perform build-time image transformations.

## Features

* Optimize and resize images, automatically.
  * Input types supported: `jpeg`, `png`, `webp`, `gif`, `tiff`, `svg`.
  * Can output multiple image sizes.
  * Keeps original image aspect ratios intact.
  * Never upscales raster images larger than original size
  * SVG files will upscale unless the `svgAllowUpscale` option is changed to `false`.
* Output multiple image formats.
  * Output formats supported: `jpeg`, `png`, `webp`, `svg` (requires SVG input, otherwise it will be skipped)
  * Uses the [sharp](https://sharp.pixelplumbing.com/) image processor.
  * Note that `svg` input can be converted to raster format.
* Cache remote images locally using [eleventy-cache-assets](https://github.com/11ty/eleventy-cache-assets).
  * Use "local" images in your HTML to prevent broken image URLs.
  * Manage the [cache duration](https://github.com/11ty/eleventy-cache-assets#change-the-cache-duration).
* Get image output data (see [sample return object](#sample-return-object)).
  * Use the image dimension values to set the `width` and `height` attributes on `<img>` elements for [proper aspect ratio mapping](https://developer.mozilla.org/en-US/docs/Web/Media/images/aspect_ratio_mapping).
* Manage image processing concurrency.

## Installation

```
npm install @11ty/eleventy-img
```

## Usage

```js
/* .eleventy.js */

const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  eleventyConfig.addJavaScriptFunction("myImage", function(src, alt, options) {
    // returns Promise
    return Image(src, options);
  });
};
```

### Options List

Defaults values are shown:

```js
{
  // array of image widths
  widths: [null],
  // widths: [null]      // output original image width
  // widths: [200]       // output 200px maxwidth
  // widths: [200, null] // output 200px and original width

  // Output image formats
  formats: ["webp", "jpeg"],
  // also: "png"
  // also: "svg" (SVG output requires SVG input)
  // "svg" requires eleventy-img v0.4.0+

  // Image directory for img element's src attribute (<img src="/img/MY_IMAGE.jpeg">)
  urlPath: "/img/",

  // Project-relative path to the output image directory
  outputDir: "./img/",

  // eleventy-img v0.4.0+
  // if using SVG output (SVG input and `svg` in formats), skip all of the raster outputs even if they’re specified in `formats`
  svgShortCircuit: false,

  // eleventy-img v0.4.0+
  // if SVG *input* is used, allow upscaling from original dimensions when converting to raster format.
  svgAllowUpscale: true,

  // eleventy-img v0.4.0+
  // Extra options to pass to the Sharp constructor
  // https://sharp.pixelplumbing.com/api-constructor#parameters
  sharpOptions: {},

  // eleventy-img v0.4.2+
  // Extra options to pass to the Sharp image format converter
  // https://sharp.pixelplumbing.com/api-output#webp
  sharpWebpOptions: {},
  // https://sharp.pixelplumbing.com/api-output#png
  sharpPngOptions: {},
  // https://sharp.pixelplumbing.com/api-output#jpeg
  sharpJpegOptions: {},

  // eleventy-img v0.3.0+
  // eleventy-cache-assets Options
  // https://github.com/11ty/eleventy-cache-assets/blob/master/README.md#options
  cacheOptions: {
    // if a remote image URL, this is the amount of time before it fetches a fresh copy
    duration: "1d",

    // project-relative path to the cache directory
    directory: ".cache",

    removeUrlQueryParams: false,
  },

  // eleventy-img v0.4.0+
  // Define custom filenames for generated images
  filenameFormat: function (id, src, width, format, options) {
    // id: hash of the original image
    // src: original image path
    // width: current width in px
    // format: current file format
    // options: set of options passed to the Image call
    if (width) {
      return `${id}-${width}.${format}`;
    }

    return `${id}.${format}`;
  }
}
```

See all [relevant `eleventy-cache-assets` options in its documentation](https://github.com/11ty/eleventy-cache-assets/blob/master/README.md#options).

## Examples

> NOTE: The examples below use the [Nunjucks](https://www.11ty.dev/docs/languages/nunjucks/#asynchronous-shortcodes) `async` shortcodes (the [JavaScript](https://www.11ty.dev/docs/languages/javascript/#asynchronous-javascript-template-functions) and [Liquid](https://www.11ty.dev/docs/languages/liquid/#asynchronous-shortcodes) template engines are async by default).

### Output Optimized Images with Optional Paths and Width/Height Attributes

#### Inputs for Optimized Images

```js
/* .eleventy.js */

const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addJavaScriptFunction
  eleventyConfig.addNunjucksAsyncShortcode("myImage", async function(src, alt, outputFormat = "jpeg") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    let stats = await Image(src, {
      widths: [null],
      formats: [outputFormat],
      urlPath: "/images/",
      outputDir: "./dist/images/"
    });
    let props = stats[outputFormat].pop();

    return `<img src="${props.url}" width="${props.width}" height="${props.height}" alt="${alt}">`;
  });
};
```

```html
<!-- src/index.njk -->

<div>
  {% myImage "./src/images/cat.jpg", "photo of my cat" %}
</div>
<div>
  {% myImage "https://my_site.com/assets/img/dog.jpg", "photo of my dog" %}
</div>
```

#### Output for Optimized Images

```html
<!-- dist/index.html -->

<div>
  <img src="/images/9b186f9b.jpeg" width="1280" height="853" alt="photo of my cat">
</div>
<div>
  <img src="/images/ez383a7m.jpeg" width="1280" height="853" alt="photo of my dog">
</div>
```

### Output Optimized Multi-Format, Multi-Size Responsive Images using `<picture>`

#### Inputs for Responsive Images

```js
/* .eleventy.js */

const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addJavaScriptFunction
  eleventyConfig.addNunjucksAsyncShortcode("myResponsiveImage", async function(src, alt) {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myResponsiveImage from: ${src}`);
    }

    let stats = await Image(src, {
      widths: [350, null],
      formats: ['webp', 'jpeg']
    });
    let lowestSrc = stats[outputFormat][0];
    let sizes = "100vw"; // Make sure you customize this!

    // Iterate over formats and widths
    return `<picture>
      ${Object.values(stats).map(imageFormat => {
        return `  <source type="image/${imageFormat[0].format}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}" sizes="${sizes}">`;
      }).join("\n")}
        <img
          src="${lowestSrc.url}"
          width="${lowestSrc.width}"
          height="${lowestSrc.height}"
          alt="${alt}">
      </picture>`;
    });
};
```

```html
<!-- index.njk -->

<div>
  {% myResponsiveImage "./src/images/cat.jpg", "photo of my cat" %}
</div>
<div>
  {% myResponsiveImage "https://my_site.com/assets/img/dog.jpg", "photo of my dog" %}
</div>
```

#### Output for Responsive Images

```html
<!-- index.html -->

<div>
  <picture>
    <source type="image/webp" srcset="/img/9b186f9b-350.webp 350w, /img/9b186f9b.webp 1280w" sizes="100vw">
    <source type="image/jpeg" srcset="/img/9b186f9b-350.jpeg 350w, /img/9b186f9b.jpeg 1280w" sizes="100vw">
    <img src="/img/9b186f9b-350.jpeg" width="350" height="233" alt="photo of my cat">
  </picture>
</div>
<div>
  <picture>
    <source type="image/webp" srcset="/img/ez383a7m-350.webp 350w, /img/ez383a7m.webp 1280w" sizes="100vw">
    <source type="image/jpeg" srcset="/img/ez383a7m-350.jpeg 350w, /img/ez383a7m.jpeg 1280w" sizes="100vw">
    <img src="/img/ez383a7m-350.jpeg" width="350" height="233" alt="photo of my dog">
  </picture>
</div>
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

### Generate custom filenames

```js
const path = require("path");
const Image = require("@11ty/eleventy-img");

let stats = await Image("./test/bio-2017.jpg", {
  widths: [600, 1280],
  formats: ["jpeg"],
  outputDir: "./test/img/",
  filenameFormat: function (id, src, width, format, options) {
    const ext = path.extname(src)
    const name = path.basename(src, ext)

    if (width) {
      return `${name}-${id}-${width}.${format}`;
    }

    return `${name}-${id}.${format}`;
  }
});

// Writes: "test/img/bio-2017-97854483-600.jpeg"
// Writes: "test/img/bio-2017-97854483.jpeg"
```
