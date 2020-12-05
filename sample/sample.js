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

  // upscale svg issue #32
  console.log( await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["png"],
    widths: [2000],
    svgShortCircuit: true,
  }));

  let leaves = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["svg", "webp", "jpeg", "png"],
    // formats: [null],
    widths: [400, 800, null],
    svgShortCircuit: true,
  });
  console.log( leaves );

  let mexicoFlag = await eleventyImage("../test/Flag_of_Mexico.svg", {
    formats: ["svg", "webp", "png"],
    widths: [1300, null],
  });
  console.log( mexicoFlag );
})();
