const eleventyImage = require("../");

(async () => {
  // Twitter removed this URL
  // await eleventyImage(`https://twitter.com/zachleat/profile_image?size=bigger`)
  // await eleventyImage(`https://twitter.com/eleven_ty/profile_image?size=bigger`, {
  //  widths: [48]
  // })

  // await eleventyImage(`https://unavatar.now.sh/twitter/zachleat?fallback=false`, {
  //   widths: [75, null],
  //   formats: [null]
  // })

  await eleventyImage(`https://unavatar.now.sh/twitter/zachleat?fallback=false`, {
    widths: [null],
    formats: ["svg"],
  })

  let stats = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["svg", "webp", "jpeg", "png"],
    // formats: [null],
    widths: [400, 800, null],
    svgShortCircuit: true,
  });
  console.log( stats );
})();
