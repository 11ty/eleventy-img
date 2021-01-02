const eleventyImage = require("../");

(async () => {
  // upscale svg issue #32
  let leaves1 = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["png", "avif"],
    widths: [2000],
  });
  console.log( { leaves1 } );

  let leaves2 = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["svg", "webp", "jpeg", "png"],
    widths: [400, 800, null],
    svgShortCircuit: true,
  });
  console.log( { leaves2 } );

  let mexicoFlag = await eleventyImage("../test/Flag_of_Mexico.svg", {
    formats: ["svg", "avif"],
    widths: [600, null],
  });
  console.log( { mexicoFlag } );

  let bioImage = await eleventyImage("../test/bio-2017.jpg", {
    formats: ["avif", "jpeg"],
    widths: [400, 1280],
  });

  console.log( bioImage );
})();
