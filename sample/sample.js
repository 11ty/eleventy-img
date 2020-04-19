const eleventyImage = require("../");

(async () => {
	await eleventyImage(`https://twitter.com/zachleat/profile_image?size=bigger`)
	await eleventyImage(`https://twitter.com/eleven_ty/profile_image?size=bigger`, {
		widths: [48]
	})
})();