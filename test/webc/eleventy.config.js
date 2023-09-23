const eleventyWebcPlugin = require("@11ty/eleventy-plugin-webc");
const { eleventyImagePlugin } = require("../../");

module.exports = function(eleventyConfig) {
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
