import eleventyWebcPlugin from "@11ty/eleventy-plugin-webc";
import { eleventyImagePlugin } from "../../img.js";

export default function(eleventyConfig) {
  // WebC
  eleventyConfig.addPlugin(eleventyWebcPlugin, {
    components: [
      // Add as a global WebC component
      "eleventy-image.webc",
    ]
  });

  // Image plugin
  eleventyConfig.addPlugin(eleventyImagePlugin, {
    // Set global default options
    formats: ["auto"],
    dryRun: true,

    defaultAttributes: {
      loading: "lazy",
    }
  });
};
