import fs from "node:fs";
import debugUtil from "debug";
import { TemplatePath } from "@11ty/eleventy-utils";

import eleventyImage, { setupLogger } from "../img.js";
import Util from "./util.js";

const debug = debugUtil("Eleventy:Image");

export function eleventyImageOnRequestDuringServePlugin(eleventyConfig, options = {}) {
  try {
    // Throw an error if the application is not using Eleventy 3.0.0-alpha.7 or newer (including prereleases).
    eleventyConfig.versionCheck(">=3.0.0-alpha.7");
  } catch(e) {
    console.log( `[11ty/eleventy-img] Warning: your version of Eleventy is incompatible with the dynamic image rendering plugin (see \`eleventyImageOnRequestDuringServePlugin\`). Any dynamically rendered images will 404 (be missing) during --serve mode but will not affect the standard build output: ${e.message}` );
  }

  setupLogger(eleventyConfig, {});

  // Eleventy 3.0 or newer only.
  eleventyConfig.setServerOptions({
    onRequest: {
      // TODO work with dev-server’s option for `injectedScriptsFolder`
      "/.11ty/image/": async function({ url }) {
        // src could be file path or full url
        let src = url.searchParams.get("src");
        let imageFormat = url.searchParams.get("format");
        let width = parseInt(url.searchParams.get("width"), 10);
        let via = url.searchParams.get("via");

        let defaultOptions;
        if(via === "webc") {
          defaultOptions = eleventyConfig.getFilter("__private_eleventyImageConfigurationOptions")();
        } else if(via === "transform") {
          defaultOptions = eleventyConfig.getFilter("__private_eleventyImageTransformConfigurationOptions")();
        }
        // if using this plugin directly (not via webc or transform), global default options will need to be passed in to the `addPlugin` call directly

        // Prefer options passed to this plugin, fallback to Transform plugin or WebC options if the image source was generated via those options.
        let opts = Object.assign({}, defaultOptions, options, {
          widths: [width || "auto"],
          formats: [imageFormat || "auto"],

          dryRun: true,
          cacheOptions: {
            // We *do* want to write files to .cache for re-use here.
            dryRun: false
          },

          transformOnRequest: false, // use the built images so we don’t go in a loop
          generatedVia: Util.KEYS.requested,
        });

        Util.addConfig(eleventyConfig, opts);

        debug( `%o transformed on request to %o at %o width.`, src, imageFormat, width );

        try {
          if(!Util.isFullUrl(src)) {
            // Image path on file system must be in working directory
            src = TemplatePath.absolutePath(".", src);

            if(!fs.existsSync(src) || !src.startsWith(TemplatePath.absolutePath("."))) {
              throw new Error(`Invalid path: ${src}`);
            }
          }

          let stats = await eleventyImage(src, opts);

          let format = Object.keys(stats).pop();
          let stat = stats[format][0];
          if(!stat) {
            throw new Error("Invalid image format.");
          }
          if(!stat.buffer) {
            throw new Error("Could not find `buffer` property for image.");
          }

          return {
            headers: {
              // TODO Set cache headers to match eleventy-fetch cache options (though remote fetchs are still written to .cache)
              "Content-Type": stat.sourceType,
            },
            body: stat.buffer,
          };
        } catch (error) {
          debug("Error attempting to transform %o: %O", src, error);

          return {
            status: 500,
            headers: {
              "Content-Type": "image/svg+xml",
              "x-error-message": error.message
            },
            body: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" x="0" y="0" viewBox="0 0 1569.4 2186" xml:space="preserve" aria-hidden="true" focusable="false"><style>.st0{fill:#bbb;stroke:#bbb;stroke-width:28;stroke-miterlimit:10}</style><g><path class="st0" d="M562.2 1410.1c-9 0-13.5-12-13.5-36.1V778.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2l142.2-36.6c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1l-82.3-.1zM930.5 1411.2c-14.4 0-26.8-1-37.4-3-10.6-2-21.6-6.5-33.1-13.5s-20.9-16.6-28.3-28.8-13.4-29.3-18-51.2-7-47.9-7-78.1V960.4c0-7.2-2-10.8-5.9-10.8h-33.4c-9 0-13.5-8.6-13.5-25.8v-29.1c0-17.6 4.5-26.4 13.5-26.4h33.4c3.9 0 5.9-4.8 5.9-14.5l9.7-209.5c1.1-19 5.7-28.5 14-28.5h53.9c9 0 13.5 9.5 13.5 28.5v209.5c0 9.7 2.1 14.5 6.5 14.5H973c9 0 13.5 8.8 13.5 26.4v29.1c0 17.2-4.5 25.8-13.5 25.8h-68.9c-2.5 0-4.2.6-5.1 1.9-.9 1.2-1.3 4.2-1.3 8.9v277.9c0 20.8 1.3 38.2 4 52s6.6 24 11.8 30.4 10.4 10.8 15.6 12.9c5.2 2.2 11.6 3.2 19.1 3.2h38.2c9.7 0 14.5 6.7 14.5 19.9v32.3c0 14.7-5.2 22.1-15.6 22.1l-54.8.1zM1137.2 1475.8c8.2 0 15.4-6.7 21.5-20.2s9.2-32.6 9.2-57.4c0-5.8-3.6-25.7-10.8-59.8l-105.6-438.9c-.7-5-1.1-9-1.1-11.9 0-12.9 2.7-19.4 8.1-19.4h65.2c5 0 9.1 1.7 12.4 5.1s5.8 10.3 7.5 20.7l70 370.5c1.4 4.3 2.3 6.5 2.7 6.5 1.4 0 2.2-2 2.2-5.9l54.9-369.5c1.4-10.8 3.7-18 6.7-21.8s6.9-5.7 11.6-5.7h45.2c6.1 0 9.2 7 9.2 21 0 3.2-.4 7.4-1.1 12.4l-95.9 499.3c-7.5 41.3-15.8 72.9-24.8 94.8s-19 36.8-30.2 44.7c-11.1 7.9-25.8 12-44.2 12.4h-5.4c-29.1 0-48.8-7.7-59.2-23.2-2.9-3.2-4.3-11.5-4.3-24.8 0-26.6 4.3-39.9 12.9-39.9.7 0 7.2 1.8 19.4 5.4 12.4 3.8 20.3 5.6 23.9 5.6z"/><g><path class="st0" d="M291.2 1411.1c-9 0-13.5-12-13.5-36.1V779.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2L371 638.2c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1h-82.4z"/></g></g></svg>`,
          };
        }
      }
    }
  });
}
