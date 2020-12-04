const eleventyImage = require("../");

(async () => {
  // Twitter removed this URL
  // await eleventyImage(`https://twitter.com/zachleat/profile_image?size=bigger`)
  // await eleventyImage(`https://twitter.com/eleven_ty/profile_image?size=bigger`, {
  //  widths: [48]
  // })

  // await eleventyImage(`https://unavatar.now.sh/twitter/zachleat?fallback=false`, {
  //   widths: [75, null]
  // })

  let stats = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    // formats: [null],
    formats: ["svg", "webp", "jpeg", "png"],
    svgShortCircuit: true,
  });
  console.log( stats );
})();
