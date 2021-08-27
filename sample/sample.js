const eleventyImage = require("../");

(async () => {
  // upscale svg issue #32
  let leaves1 = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["png", "avif"],
    widths: [2000],
  });
  console.log( "https://www.netlify.com/v3/img/components/leaves.svg" );
  console.dir( leaves1 );

  let leaves2 = await eleventyImage(`https://www.netlify.com/v3/img/components/leaves.svg`, {
    formats: ["svg", "webp", "jpeg", "png"],
    widths: [400, 800, null],
    svgShortCircuit: true,
  });
  console.log( "https://www.netlify.com/v3/img/components/leaves.svg" );
  console.dir( leaves2 );

  let possum = await eleventyImage(`https://www.11ty.dev/img/possum-balloon-original-sm.png`, {
    formats: ["webp", "jpeg", "png"],
    widths: [null],
  });
  console.log( "https://www.11ty.dev/img/possum-balloon-original-sm.png" );
  console.dir( possum );

  let possumStats = eleventyImage.statsSync("https://www.11ty.dev/img/possum-balloon-original-sm.png", {
    formats: ["avif", "jpeg"],
    widths: [400, 1280],
  });
  console.log( "https://www.11ty.dev/img/possum-balloon-original-sm.png (statsSync)" );
  console.dir( possumStats );


  /* Local images */
  let mexicoFlag = await eleventyImage("../test/Flag_of_Mexico.svg", {
    formats: ["svg", "avif"],
    widths: [600, null],
  });
  console.log( "../test/Flag_of_Mexico.svg");
  console.dir( mexicoFlag );

  let bioImage = await eleventyImage("../test/bio-2017.jpg", {
    formats: ["avif", "jpeg"],
    widths: [400, 1280],
  });

  console.log( "./test/bio-2017.jpg" );
  console.dir( bioImage );

  let bioImageStats = eleventyImage.statsSync("../test/bio-2017.jpg", {
    formats: ["avif", "jpeg"],
    widths: [400, 1280],
  });
  console.log( "./test/bio-2017.jpg (statsSync)" );
  console.dir( bioImageStats );

  let bioImageDryRun = await eleventyImage("../test/bio-2017.jpg", {
    dryRun: true,
    formats: ["avif", "jpeg"],
    widths: [400, 1280],
  });

  console.log( "./test/bio-2017.jpg (dryRun)" );
  console.dir( bioImageDryRun );
})();
