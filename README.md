# eleventy-img

Low level utility to perform build-time image transformations.

## Features

* Optimize and resize images, automatically.
  * Can output multiple image sizes.
  * Keeps original image aspect ratios intact.
  * Never upscales images larger than original size.
* Output multiple image formats.
  * The [sharp](https://sharp.pixelplumbing.com/) image processor supports `jpeg`, `png`, `webp`, `raw`, and `tiff`.
  * Incoming `gif` and `svg` images are converted to `png`.
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

  // output image formats
  formats: ["webp", "jpeg"], // also supported by sharp: "png", "raw", "tiff"

  // image directory for img element's src attribute (<img src="/img/MY_IMAGE.jpeg">)
  urlPath: "/img/",

  // project-relative path to the output image directory
  outputDir: "./img/",

  // eleventy-cache-assets options (available in eleventy-img 0.3.0+)
  cacheOptions: {
    // if a remote image URL, this is the amount of time before it fetches a fresh copy
    duration: "1d",
    // project-relative path to the cache directory
    directory: ".cache",

    removeUrlQueryParams: false,
  },

  cacheDuration: "1d", // deprecated, use cacheOptions above
}
```

See all [relevant `eleventy-cache-assets` options in its documentation](https://github.com/11ty/eleventy-cache-assets/blob/master/README.md#options).

## Examples

### Output Optimized Images with Width/Height Attributes

> Requires `async`, make sure you’re using this in Liquid, 11ty.js, or Nunjucks (use an async shortcode).

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

    // returns Promise
    let stats = await Image(src, {
      widths: [50],
      formats: [outputFormat],
      urlPath: "/images/",
      outputDir: "./dist/images/",
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
  <img src="/images/3d00b40-50.jpeg" width="50" height="50" alt="photo of my cat">
</div>
<div>
  <img src="/images/2311v21-50.jpeg" width="50" height="50" alt="photo of my dog">
</div>
```

### Output Optimized Multi-Format, Multi-Size Responsive Images using `<picture>`

#### Inputs for Responsive Images

```js
/* .eleventy.js */

const Image = require("@11ty/eleventy-img");
module.exports = function(eleventyConfig) {
  // works also with addLiquidShortcode or addJavaScriptFunction
  eleventyConfig.addNunjucksAsyncShortcode("myResponsiveImage", async function(src, alt, outputFormat = "jpeg") {
    if(alt === undefined) {
      // You bet we throw an error on missing alt (alt="" works okay)
      throw new Error(`Missing \`alt\` on myResponsiveImage from: ${src}`);
    }

    let stats = await Image(src, {
      widths: [null],
      formats: [outputFormat],
      urlPath: "/images/",
      outputDir: "./dist/images/",
    });
    let lowestSrc = stats[outputFormat][0];
    let sizes = "100vw"; // Make sure you customize this!

    // Iterate over formats and widths
    return `<picture>
      ${Object.values(stats).map(imageFormat => {
        return `  <source type="image/${imageFormat[0].format}" srcset="${imageFormat.map(entry => `${entry.url} ${entry.width}w`).join(", ")}" sizes="${sizes}">`;
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
  {% myResponsiveImage "./src/images/cat.jpg", "photo of my cat"}
</div>
<div>
  {% myResponsiveImage "https://my_site.com/assets/img/dog.jpg", "photo of my dog" %}
</div>
```

#### Output for Responsive Images

```html
<!-- dist/index.html -->

<div>
  <picture>
    <source type="image/jpeg" srcset="/images/3d00b40-96.jpeg 100w" sizes="100vw">
    <img src="/images/3d00b40.jpeg" width="100" height="100" alt="photo of my cat">
</div>
<div>
  <picture>
    <source type="image/jpeg" srcset="/images/2311v21-75.jpeg 100w" sizes="100vw">
    <img src="/images/2311v21.jpeg" width="100" height="100" alt="photo of my dog">
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
