import { getGlobalOptions } from "./global-options.js";
import { eleventyImageOnRequestDuringServePlugin } from "./on-request-during-serve-plugin.js";

export function eleventyWebcOptionsPlugin(eleventyConfig, options = {}) {
  options = Object.assign({
    transformOnRequest: process.env.ELEVENTY_RUN_MODE === "serve",
  }, options);

  // Notably, global options are not shared automatically with the `eleventyImageTransformPlugin` below.
  // Devs can pass in the same object to both if they want!
  eleventyConfig.addJavaScriptFunction("__private_eleventyImageConfigurationOptions", () => {
    return getGlobalOptions(eleventyConfig, options, "webc");
  });

  if(options.transformOnRequest !== false) {
    // Add the on-request plugin automatically (unless opt-out in this plugins options only)
    eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);
  }
}
