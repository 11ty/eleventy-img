const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { URL } = require("node:url");

const test = require("ava");
const sharp = require("sharp");
const pixelmatch = require('pixelmatch');

const eleventyImage = require("../");

// Remember that any outputPath tests must use path.join to work on Windows

test("getFormats", t => {
  let formats = eleventyImage.getFormats("webp,png");
  t.is(formats.length, 2);
  t.is(formats[0], "webp");
  t.is(formats[1], "png");
});

test("getFormats (three) with svg reorder", t => {
  let formats = eleventyImage.getFormats("webp,png,svg");
  t.is(formats.length, 3);
  // svg should be first
  t.is(formats[0], "svg");
  t.is(formats[1], "webp");
  t.is(formats[2], "png");
});

test("getFormats (three) with svg reorder 2", t => {
  let formats = eleventyImage.getFormats("webp,svg,png");
  t.is(formats.length, 3);
  // svg should be first
  t.is(formats[0], "svg");
  t.is(formats[1], "webp");
  t.is(formats[2], "png");
});

test("getFormats (three) with svg no reorder", t => {
  let formats = eleventyImage.getFormats("svg,webp,png");
  t.is(formats.length, 3);
  // svg should be first
  t.is(formats[0], "svg");
  t.is(formats[1], "webp");
  t.is(formats[2], "png");
});

test("getFormats removes duplicates", t => {
  let formats = eleventyImage.getFormats("svg,webp,png,webp,svg");
  t.is(formats.length, 3);
  // svg should be first
  t.is(formats[0], "svg");
  t.is(formats[1], "webp");
  t.is(formats[2], "png");
});

test("Sync with jpeg input", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg");
  t.is(stats.webp.length, 1);
  t.is(stats.jpeg.length, 1);
});

test("Sync by dimension with jpeg input", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853);
  t.is(stats.webp.length, 1);
  t.is(stats.jpeg.length, 1);
});

test("Sync with widths", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [300]
  });
  t.is(stats.webp.length, 1);
  t.is(stats.webp[0].width, 300);
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 300);
});

test("Sync by dimension with widths", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
    widths: [300]
  });
  t.is(stats.webp.length, 1);
  t.is(stats.webp[0].width, 300);
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 300);
});


test("Sync with two widths", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [300, 500]
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[1].width, 500);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[1].width, 500);
});

test("Sync by dimension with two widths", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
    widths: [300, 500]
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[1].width, 500);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[1].width, 500);
});


test("Sync with null width", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [300, null]
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[0].height, 199);
  t.is(stats.webp[1].width, 1280);
  t.is(stats.webp[1].height, 853);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[0].height, 199);
  t.is(stats.jpeg[1].width, 1280);
  t.is(stats.jpeg[1].height, 853);
});

test("Sync with 'auto' width", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [300, 'auto']
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[0].height, 199);
  t.is(stats.webp[1].width, 1280);
  t.is(stats.webp[1].height, 853);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[0].height, 199);
  t.is(stats.jpeg[1].width, 1280);
  t.is(stats.jpeg[1].height, 853);
});

test("Sync by dimension with null width", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
    widths: [300, null]
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[0].height, 199);
  t.is(stats.webp[1].width, 1280);
  t.is(stats.webp[1].height, 853);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[0].height, 199);
  t.is(stats.jpeg[1].width, 1280);
  t.is(stats.jpeg[1].height, 853);
});

test("Sync by dimension with 'auto' width", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
    widths: [300, 'auto']
  });
  t.is(stats.webp.length, 2);
  t.is(stats.webp[0].width, 300);
  t.is(stats.webp[0].height, 199);
  t.is(stats.webp[1].width, 1280);
  t.is(stats.webp[1].height, 853);
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[0].height, 199);
  t.is(stats.jpeg[1].width, 1280);
  t.is(stats.jpeg[1].height, 853);
});

test("Use 'auto' format as original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    formats: ['auto'],
    outputDir: "./test/img/"
  });

  t.is(stats.auto, undefined);
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (two sizes)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, 2000],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (with a null in there)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Minimum width threshold (valid)", async t => {
  // original is 1280
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [400, 1300],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-400.jpeg"));
  t.is(stats.jpeg[0].width, 400);
  t.is(stats.jpeg[1].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[1].width, 1280);
});

test("Minimum width threshold (one width larger that source)", async t => {
  // original is 1280
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1800],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Minimum width threshold (one gets rejected)", async t => {
  // original is 1280
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1200, 1300],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1200.jpeg"));
  t.is(stats.jpeg[0].width, 1200);
});

test("Minimum width threshold (one gets rejected, higher max)", async t => {
  // original is 1280
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1200, 1500],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1200.jpeg"));
  t.is(stats.jpeg[0].width, 1200);
});

test("Minimum width threshold (one gets rejected, lower min)", async t => {
  // original is 1280
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1100, 1500],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1100.jpeg"));
  t.is(stats.jpeg[0].width, 1100);
});

test("Just falsy width", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  // breaking change in 0.5: always use width in filename
  t.is(stats.jpeg[0].outputPath, path.join("test/img/KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/KkPMmHd3hP-1280.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/KkPMmHd3hP-1280.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Use custom function to define file names", async (t) => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [600, 1280],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    filenameFormat: function (id, src, width, format) { // and options
      const ext = path.extname(src);
      const name = path.basename(src, ext);

      if (width) {
        return `${name}-${id}-${width}.${format}`;
      }

      return `${name}-${id}.${format}`;
    }
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/bio-2017-KkPMmHd3hP-600.jpeg"));
  t.is(stats.jpeg[0].url, "/img/bio-2017-KkPMmHd3hP-600.jpeg");
  t.is(stats.jpeg[0].srcset, "/img/bio-2017-KkPMmHd3hP-600.jpeg 600w");
  t.is(stats.jpeg[0].width, 600);
  t.is(stats.jpeg[1].outputPath, path.join("test/img/bio-2017-KkPMmHd3hP-1280.jpeg"));
  t.is(stats.jpeg[1].url, "/img/bio-2017-KkPMmHd3hP-1280.jpeg");
  t.is(stats.jpeg[1].srcset, "/img/bio-2017-KkPMmHd3hP-1280.jpeg 1280w");
  t.is(stats.jpeg[1].width, 1280);
});

test("Unavatar test", t => {
  let stats = eleventyImage.statsByDimensionsSync("https://unavatar.now.sh/twitter/zachleat?fallback=false", 400, 400, {
    widths: [75],
    remoteAssetContent: 'remote asset content'
  });

  t.is(stats.webp.length, 1);
  t.is(stats.webp[0].width, 75);
  t.is(stats.webp[0].height, 75);
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 75);
  t.is(stats.jpeg[0].height, 75);
});

test("Ask for svg output from a raster image (skipped)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    formats: ["svg"],
    outputDir: "./test/img/"
  });

  t.deepEqual(stats, {});
});

test("Upscale an SVG, Issue #32", async t => {
  let stats = await eleventyImage("./test/logo.svg", {
    widths: [3000],
    formats: ["png"],
    outputDir: "./test/img/"
  });

  t.is(stats.png.length, 1);
  t.is(stats.png[0].filename.slice(-9), "-3000.png"); // should include width in filename
  t.is(stats.png[0].width, 3000);
  t.is(stats.png[0].height, 4179);
});

test("Upscale an SVG (disallowed in option), Issue #32", async t => {
  let stats = await eleventyImage("./test/logo.svg", {
    widths: [3000],
    formats: ["png"],
    outputDir: "./test/img/",
    svgAllowUpscale: false
  });

  t.is(stats.png.length, 1);
  t.not(stats.png[0].filename.slice(-9), "-3000.png"); // should not include width in filename
  t.is(stats.png[0].width, 1569);
  t.is(stats.png[0].height, 2186);
});

test("svgShortCircuit", async t => {
  let stats = await eleventyImage("./test/logo.svg", {
    widths: [null],
    formats: ["svg", "png", "webp"],
    outputDir: "./test/img/",
    svgShortCircuit: true,
  });

  t.deepEqual(Object.keys(stats), ["svg"]);
  t.is(stats.svg.length, 1);
  t.is(stats.svg[0].size, 1936);
});

test("svgShortCircuit (on a raster source) #242", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: ["auto"],
    formats: ["svg", "png"],
    svgShortCircuit: true,
    useCache: false,
    dryRun: true,
  });

  t.deepEqual(Object.keys(stats), ["png"]);
  t.is(stats.png.length, 1);
  t.is(stats.png[0].size, 2511518);
});


test("getWidths", t => {
  t.deepEqual(eleventyImage.getWidths(300, [null]), [300]); // want original
  t.deepEqual(eleventyImage.getWidths(300, ['auto']), [300]); // want original
  t.deepEqual(eleventyImage.getWidths(300, [600]), [300]); // want larger
  t.deepEqual(eleventyImage.getWidths(300, [150]), [150]); // want smaller

  t.deepEqual(eleventyImage.getWidths(300, [600, null]), [300]);
  t.deepEqual(eleventyImage.getWidths(300, [null, 600]), [300]);
  t.deepEqual(eleventyImage.getWidths(300, [600, 'auto']), [300]);
  t.deepEqual(eleventyImage.getWidths(300, ['auto', 600]), [300]);
  t.deepEqual(eleventyImage.getWidths(300, [150, null]), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, [null, 150]), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, [150, 'auto']), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, ['auto', 150]), [150,300]);
});

test("getWidths removes duplicates", t => {
  t.deepEqual(eleventyImage.getWidths(300, [null, 300]), [300]);
  t.deepEqual(eleventyImage.getWidths(300, [300, 300]), [300]);
  t.deepEqual(eleventyImage.getWidths(600, [300, 400, 300, 500, 400]), [300, 400, 500]);
});

test("getWidths allow upscaling", t => {
  t.deepEqual(eleventyImage.getWidths(300, [null], true), [300]); // want original
  t.deepEqual(eleventyImage.getWidths(300, ['auto'], true), [300]); // want original
  t.deepEqual(eleventyImage.getWidths(300, [600], true), [600]); // want larger
  t.deepEqual(eleventyImage.getWidths(300, [150], true), [150]); // want smaller

  t.deepEqual(eleventyImage.getWidths(300, [600, null], true), [300, 600]);
  t.deepEqual(eleventyImage.getWidths(300, [null, 600], true), [300, 600]);
  t.deepEqual(eleventyImage.getWidths(300, [600, 'auto'], true), [300, 600]);
  t.deepEqual(eleventyImage.getWidths(300, ['auto', 600], true), [300, 600]);
  t.deepEqual(eleventyImage.getWidths(300, [150, null], true), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, [null, 150], true), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, [150, 'auto'], true), [150,300]);
  t.deepEqual(eleventyImage.getWidths(300, ['auto', 150], true), [150,300]);
});

test("Sync by dimension with jpeg input (wrong dimensions, supplied are smaller than real)", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 164, 164, {
    widths: [164, 328],
    formats: ["jpeg"],
  });

  // this won’t upscale so it will miss out on higher resolution images but there won’t be any broken image URLs in the output
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("img/KkPMmHd3hP-164.jpeg"));
});

test("Sync by dimension with jpeg input (wrong dimensions, supplied are larger than real)", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1500, 1500, {
    widths: [164, 328],
    formats: ["jpeg"],
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].outputPath, path.join("img/KkPMmHd3hP-164.jpeg"));
  t.is(stats.jpeg[1].outputPath, path.join("img/KkPMmHd3hP-328.jpeg"));
});

test("Keep a cache, reuse with same file names and options", async t => {
  let promise1 = eleventyImage("./test/bio-2017.jpg", { dryRun: true });
  let promise2 = eleventyImage("./test/bio-2017.jpg", { dryRun: true });
  t.is(promise1, promise2);

  let stats1 = await promise1;
  let stats2 = await promise2;
  t.deepEqual(stats1, stats2);
});

test("Keep a cache, reuse with same remote url and options", async t => {
  let promise1 = eleventyImage("https://www.zachleat.com/img/avatar-2017-big.png", { dryRun: true });
  let promise2 = eleventyImage("https://www.zachleat.com/img/avatar-2017-big.png", { dryRun: true });
  t.is(promise1, promise2);

  let stats1 = await promise1;
  let stats2 = await promise2;
  t.deepEqual(stats1, stats2);
});

test("Keep a cache, don’t reuse with same file names and different options", async t => {
  let promise1 = eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    dryRun: true,
  });
  let promise2 = eleventyImage("./test/bio-2017.jpg", {
    widths: [300],
    dryRun: true,
  });
  t.not(promise1, promise2);

  let stats1 = await promise1;
  let stats2 = await promise2;
  t.notDeepEqual(stats1, stats2);

  t.is(stats1.jpeg.length, 1);
  t.is(stats2.jpeg.length, 1);
});

test("Keep a cache, don’t reuse with if the image changes, check promise equality", async t => {
  fs.copyFileSync("./test/modify-bio-original.jpg", "./test/generated-modify-bio.jpg");

  let promise1 = eleventyImage("./test/generated-modify-bio.jpg", {
    outputDir: "./test/img/",
  });

  fs.copyFileSync("./test/modify-bio-grayscale.jpg", "./test/generated-modify-bio.jpg");

  let promise2 = eleventyImage("./test/generated-modify-bio.jpg", {
    outputDir: "./test/img/",
  });

  t.not(promise1, promise2);
});

let method = os.platform() === "win32" && process.env.GITHUB_ACTIONS ? test.skip : test;
method("Keep a cache, don’t reuse with if the image changes, check output", async t => {
  let outputPathTemp = "./test/generated-modify2-bio.jpg";

  fs.copyFileSync("./test/modify2-bio-original.jpg", outputPathTemp);

  let stats1 = await eleventyImage(outputPathTemp, {
    outputDir: "./test/img/",
  });

  fs.copyFileSync("./test/modify2-bio-grayscale.jpg", outputPathTemp);

  let stats2 = await eleventyImage(outputPathTemp, {
    outputDir: "./test/img/",
  });

  t.notDeepEqual(stats1, stats2);

  t.is(stats1.jpeg.length, 1);
  t.is(stats2.jpeg.length, 1);
});

test("SVG to Buffer input! Issue #40", async t => {
  let svgContent = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 1569.4 2186" xml:space="preserve" aria-hidden="true" focusable="false"><style>.st0{fill:#fff;stroke:#fff;stroke-width:28;stroke-miterlimit:10}</style><g><path class="st0" d="M562.2 1410.1c-9 0-13.5-12-13.5-36.1V778.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2l142.2-36.6c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1l-82.3-.1zM930.5 1411.2c-14.4 0-26.8-1-37.4-3-10.6-2-21.6-6.5-33.1-13.5s-20.9-16.6-28.3-28.8-13.4-29.3-18-51.2-7-47.9-7-78.1V960.4c0-7.2-2-10.8-5.9-10.8h-33.4c-9 0-13.5-8.6-13.5-25.8v-29.1c0-17.6 4.5-26.4 13.5-26.4h33.4c3.9 0 5.9-4.8 5.9-14.5l9.7-209.5c1.1-19 5.7-28.5 14-28.5h53.9c9 0 13.5 9.5 13.5 28.5v209.5c0 9.7 2.1 14.5 6.5 14.5H973c9 0 13.5 8.8 13.5 26.4v29.1c0 17.2-4.5 25.8-13.5 25.8h-68.9c-2.5 0-4.2.6-5.1 1.9-.9 1.2-1.3 4.2-1.3 8.9v277.9c0 20.8 1.3 38.2 4 52s6.6 24 11.8 30.4 10.4 10.8 15.6 12.9c5.2 2.2 11.6 3.2 19.1 3.2h38.2c9.7 0 14.5 6.7 14.5 19.9v32.3c0 14.7-5.2 22.1-15.6 22.1l-54.8.1zM1137.2 1475.8c8.2 0 15.4-6.7 21.5-20.2s9.2-32.6 9.2-57.4c0-5.8-3.6-25.7-10.8-59.8l-105.6-438.9c-.7-5-1.1-9-1.1-11.9 0-12.9 2.7-19.4 8.1-19.4h65.2c5 0 9.1 1.7 12.4 5.1s5.8 10.3 7.5 20.7l70 370.5c1.4 4.3 2.3 6.5 2.7 6.5 1.4 0 2.2-2 2.2-5.9l54.9-369.5c1.4-10.8 3.7-18 6.7-21.8s6.9-5.7 11.6-5.7h45.2c6.1 0 9.2 7 9.2 21 0 3.2-.4 7.4-1.1 12.4l-95.9 499.3c-7.5 41.3-15.8 72.9-24.8 94.8s-19 36.8-30.2 44.7c-11.1 7.9-25.8 12-44.2 12.4h-5.4c-29.1 0-48.8-7.7-59.2-23.2-2.9-3.2-4.3-11.5-4.3-24.8 0-26.6 4.3-39.9 12.9-39.9.7 0 7.2 1.8 19.4 5.4 12.4 3.8 20.3 5.6 23.9 5.6z"/><g><path class="st0" d="M291.2 1411.1c-9 0-13.5-12-13.5-36.1V779.9c0-11.5-2.3-16.9-7-16.2-28.4 7.2-42.7 10.8-43.1 10.8-7.9.7-11.8-7.2-11.8-23.7v-51.7c0-14.3 4.3-22.4 12.9-24.2L371 638.2c1.1-.3 2.7-.5 4.8-.5 7.9 0 11.8 8.4 11.8 25.3v712c0 24.1-4.7 36.1-14 36.1h-82.4z"/></g></g></svg>`;
  let output = await eleventyImage(Buffer.from(svgContent), {
    outputDir: "./test/img/"
  });

  t.is(output.jpeg.length, 1);
  t.is(output.webp.length, 1);

  t.is(output.jpeg[0].width, 1569);
  t.is(output.webp[0].width, 1569);
});

test("Dryrun should include the buffer instance", async t => {
  let result = await eleventyImage("./test/bio-2017.jpg", { dryRun: true });

  t.truthy(result.jpeg[0].buffer);
  t.truthy(result.webp[0].buffer);
});

// TODO dryrun buffer with a remote image?


test("Test with a string width", async t => {
  let image = await eleventyImage("./test/bio-2017.jpg", {
    widths: ["340"],
    formats: [null],
    dryRun: true,
  });

  t.deepEqual(image.jpeg[0].width, 340);
});

test("Test with a string px width", async t => {
  let image = await eleventyImage("./test/bio-2017.jpg", {
    widths: ["340px"],
    formats: [null],
    dryRun: true,
  });

  t.deepEqual(image.jpeg[0].width, 340);
});

test("Test with a string float width", async t => {
  let image = await eleventyImage("./test/bio-2017.jpg", {
    widths: ["340.9"],
    formats: [null],
    dryRun: true,
  });

  t.deepEqual(image.jpeg[0].width, 340);
});

test("Test with 'auto' width", async t => {
  let image = await eleventyImage("./test/bio-2017.jpg", {
    widths: ['auto'],
    formats: [null],
    dryRun: true,
  });

  t.deepEqual(image.jpeg[0].width, 1280);
  t.deepEqual(image.jpeg[0].height, 853);
});

test("Using `jpg` in formats Issue #64", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    formats: ["jpg"],
    dryRun: true,
  });
  delete stats.jpeg[0].buffer;
  t.deepEqual(stats, {
    jpeg: [
      {
        filename: 'KkPMmHd3hP-1280.jpeg',
        format: 'jpeg',
        height: 853,
        outputPath: path.join('img/KkPMmHd3hP-1280.jpeg'),
        size: 276231,
        sourceType: "image/jpeg",
        srcset: '/img/KkPMmHd3hP-1280.jpeg 1280w',
        url: '/img/KkPMmHd3hP-1280.jpeg',
        width: 1280,
      },
    ]
  });
});

test("SVG files and dryRun: Issue #72", async t => {
  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["svg"],
    dryRun: true,
  });
  t.false(fs.existsSync("./img/8b4d670b-900.svg"));
  t.truthy(stats.svg[0]);
});

test("Sorted object keys", async t => {
  t.deepEqual(eleventyImage.Util.getSortedObject({
    c: 3,
    b: 2,
    a: 1
  }), {
    a: 1,
    b: 2,
    c: 3
  });

  t.deepEqual(eleventyImage.Util.getSortedObject({
    b: 2,
    a: 1,
    1: 3,
  }), {
    1: 3,
    a: 1,
    b: 2,
  });
});

test("widths array should be ignored in hashing", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1280]
  });

  let stats2 = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [300, 600]
  });

  t.is(stats.jpeg[0].url, "/img/KkPMmHd3hP-1280.jpeg");
  t.is(stats2.jpeg[0].url, "/img/KkPMmHd3hP-300.jpeg");
  t.is(stats2.jpeg[1].url, "/img/KkPMmHd3hP-600.jpeg");
});

test("statsSync and eleventyImage output comparison", async t => {
  let statsSync = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [399],
    formats: ["jpeg"]
  });
  let statsByDimensionsSync = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
    widths: [399],
    formats: ["jpeg"]
  });
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [399],
    formats: ["jpeg"],
    dryRun: true
  });

  // these aren’t expected in the statsSync method
  delete stats.jpeg[0].buffer;
  delete stats.jpeg[0].size;

  t.deepEqual(statsSync, stats);
  t.deepEqual(statsByDimensionsSync, stats);
  t.deepEqual(statsSync, statsByDimensionsSync);
});

test("urlFormat using local image", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    formats: ["auto"],
    urlFormat: function({ src }) {
      let u = new URL(src, "https://www.zachleat.com/");
      return `https://v1.image.11ty.dev/${encodeURIComponent(u)}/`;
    }
  });

  t.truthy(stats);
  t.truthy(stats.jpeg.length);
  t.truthy(stats.jpeg[0].buffer);
  t.truthy(stats.jpeg[0].size);

  t.is(stats.jpeg[0].width, 1280);
  t.is(stats.jpeg[0].height, 853);
  t.is(stats.jpeg[0].url, "https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Ftest%2Fbio-2017.jpg/");
});

test("urlFormat using remote image", async t => {
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017.png", {
    formats: ["auto"],
    urlFormat: function({ src }) {
      return `https://v1.image.11ty.dev/${encodeURIComponent(src)}/`;
    }
  });
  t.truthy(stats);
  t.truthy(stats.png.length);
  t.truthy(stats.png[0].buffer);
  t.truthy(stats.png[0].size);

  t.is(stats.png[0].width, 160);
  t.is(stats.png[0].height, 160);
  t.is(stats.png[0].url, "https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Fimg%2Favatar-2017.png/");
});


test("statsOnly using local image", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    statsOnly: true,
    formats: ["auto"],
    urlFormat: function({ src }) {
      let u = new URL(src, "https://www.zachleat.com/");
      return `https://v1.image.11ty.dev/${encodeURIComponent(u)}/`;
    }
  });

  t.deepEqual(stats, {
    jpeg: [
      {
        format: 'jpeg',
        height: 853,
        sourceType: 'image/jpeg',
        srcset: 'https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Ftest%2Fbio-2017.jpg/ 1280w',
        url: 'https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Ftest%2Fbio-2017.jpg/',
        width: 1280,
      },
    ],
  });
});

test("statsOnly using remote image", async t => {
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017.png", {
    statsOnly: true,
    remoteImageMetadata: {
      width: 160,
      height: 160,
      format: "png"
    },
    formats: ["auto"],
    urlFormat: function({ src }) {
      return `https://v1.image.11ty.dev/${encodeURIComponent(src)}/`;
    }
  });
  t.deepEqual(stats, {
    png: [
      {
        format: 'png',
        height: 160,
        sourceType: 'image/png',
        srcset: 'https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Fimg%2Favatar-2017.png/ 160w',
        url: 'https://v1.image.11ty.dev/https%3A%2F%2Fwww.zachleat.com%2Fimg%2Favatar-2017.png/',
        width: 160,
      },
    ],
  });
});


test("statsOnly using local image, no urlFormat", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    statsOnly: true,
    formats: ["auto"],
    filenameFormat(hash, src, width, format) {
      return "this-should-not-exist." + format;
    }
  });

  // No buffer
  t.truthy(stats.jpeg[0]);
  t.falsy(stats.jpeg[0].buffer);

  // make sure it doesn’t exist.
  t.true(!fs.existsSync(stats.jpeg[0].outputPath));

  t.deepEqual(stats, {
    jpeg: [
      {
        format: 'jpeg',
        height: 853,
        sourceType: 'image/jpeg',
        filename: "this-should-not-exist.jpeg",
        outputPath: path.join("img", "this-should-not-exist.jpeg"),
        srcset: '/img/this-should-not-exist.jpeg 1280w',
        url: '/img/this-should-not-exist.jpeg',
        width: 1280,
      },
    ],
  });
});

test("statsOnly using remote image, no urlFormat", async t => {
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017.png", {
    statsOnly: true,
    remoteImageMetadata: {
      width: 160,
      height: 160,
      format: "png"
    },
    formats: ["auto"],
    filenameFormat(hash, src, width, format) {
      return "this-should-not-exist." + format;
    },
  });

  // No buffer
  t.truthy(stats.png[0]);
  t.falsy(stats.png[0].buffer);

  // make sure it doesn’t exist.
  t.true(!fs.existsSync(stats.png[0].outputPath));

  t.deepEqual(stats, {
    png: [
      {
        format: 'png',
        height: 160,
        sourceType: 'image/png',
        filename: "this-should-not-exist.png",
        outputPath: path.join("img", "this-should-not-exist.png"),
        srcset: '/img/this-should-not-exist.png 160w',
        url: '/img/this-should-not-exist.png',
        width: 160,
      },
    ],
  });
});

test("src is recognized as local when using absolute path on Windows", t => {
  let image = new eleventyImage.Image("C:\\image.jpg");

  t.is(image.isRemoteUrl, false);
});

test("src is recognized as local when using absolute path on POSIX", t => {
  let image = new eleventyImage.Image("/home/user/image.jpg");

  t.is(image.isRemoteUrl, false);
});

test("src is recognized as remote when using https scheme", t => {
  let image = new eleventyImage.Image("https://example.com/image.jpg");

  t.is(image.isRemoteUrl, true);
});

test("src is recognized as remote when using http scheme", t => {
  let image = new eleventyImage.Image("http://example.com/image.jpg");

  t.is(image.isRemoteUrl, true);
});

test("Maintains orientation #132", async t => {
  let stats = await eleventyImage("./test/orientation.jpg", {
    // upscaling rules apply:
    //  even though the image is 76px wide and has exif width: 151,
    //  any number above 76 will return a 76px width image
    widths: [151],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 76);
  t.is(stats.jpeg[0].height, 151);
});

// Broken test cases from https://github.com/recurser/exif-orientation-examples
test("#158: Test EXIF orientation data landscape (3) with fixOrientation", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_3.jpg", {
    widths: [200, "auto"],
    formats: ['auto'],
    useCache: false,
    dryRun: true,
    fixOrientation: true,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 200);
  t.is(stats.jpeg[1].width, 1800);
  t.is(Math.floor(stats.jpeg[0].height), 133);
  t.is(stats.jpeg[1].height, 1200);

  // This orientation (180º rotation) preserves image dimensions and requires an image diff
  const readToRaw = async input => {
    // pixelmatch requires 4 bytes/pixel, hence alpha
    return sharp(input).ensureAlpha().toFormat(sharp.format.raw).toBuffer();
  };
  for (const [inSrc, outStat] of [
    ["./test/exif-Landscape_3-bakedOrientation-200.jpg", stats.jpeg[0]],
    ["./test/exif-Landscape_3-bakedOrientation.jpg", stats.jpeg[1]]]) {
    const inRaw = await readToRaw(inSrc);
    const outRaw = await readToRaw(outStat.buffer);
    t.is(pixelmatch(inRaw, outRaw, null, outStat.width, outStat.height, { threshold: 0.15 }), 0);
  }
});

test("#158: Test EXIF orientation data landscape (3) without fixOrientation", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_3.jpg", {
    widths: [200, "auto"],
    formats: ['auto'],
    useCache: false,
    dryRun: true,
    fixOrientation: false,
  });

  // This orientation (180º rotation) preserves image dimensions and requires an image diff
  const readToRaw = async input => {
    // pixelmatch requires 4 bytes/pixel, hence alpha
    return sharp(input).ensureAlpha().toFormat(sharp.format.raw).toBuffer();
  };
  for (const [inSrc, outStat] of [
    ["./test/exif-Landscape_3-bakedOrientation-200.jpg", stats.jpeg[0]],
    ["./test/exif-Landscape_3-bakedOrientation.jpg", stats.jpeg[1]]]) {
    const inRaw = await readToRaw(inSrc);
    const outRaw = await readToRaw(outStat.buffer);

    // rotation did not happen and the images are different
    // when/if fixOrientation is defaulted to true this test will have to be === 0
    t.true(pixelmatch(inRaw, outRaw, null, outStat.width, outStat.height, { threshold: 0.15 }) > 0);
  }
});

test("#132: Test EXIF orientation data landscape (5)", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_5.jpg", {
    widths: [400, "auto"],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 400);
  t.is(stats.jpeg[1].width, 1800);
  t.is(Math.floor(stats.jpeg[0].height), 266);
  t.is(stats.jpeg[1].height, 1200);
});

test("#132: Test EXIF orientation data landscape (6)", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_6.jpg", {
    widths: [400],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(Math.floor(stats.jpeg[0].height), 266);
});

test("#132: Test EXIF orientation data landscape (7)", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_7.jpg", {
    widths: [400],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(Math.floor(stats.jpeg[0].height), 266);
});

test("#132: Test EXIF orientation data landscape (8)", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_8.jpg", {
    widths: [400],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(Math.floor(stats.jpeg[0].height), 266);
});

test("#158: Test EXIF orientation data landscape (15) without fixOrientation", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_15.jpg", {
    widths: [400],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(Math.floor(stats.jpeg[0].height), 266);
});


test("#158: Test EXIF orientation data landscape (15) with fixOrientation", async t => {
  let stats = await eleventyImage("./test/exif-Landscape_15.jpg", {
    widths: [400],
    formats: ['auto'],
    outputDir: "./test/img/",
    dryRun: true,
    fixOrientation: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(Math.floor(stats.jpeg[0].height), 266);
});

test("Animated gif", async t => {
  let stats = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["auto"],
    sharpOptions: {
      animated: true
    },
    useCache: false,
    outputDir: "./test/img/",
  });

  t.is(stats.gif.length, 1);
  t.is(stats.gif[0].width, 400);
  t.is(stats.gif[0].height, 400);
  // it’s a big boi
  t.true( stats.gif[0].size > 1000*999 );
});

test("Animated gif format filtering (no good ones)", async t => {
  let stats = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["jpeg"],
    sharpOptions: {
      animated: true
    },
    useCache: false,
  });

  t.deepEqual(Object.keys(stats), ["jpeg"]);
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].width, 400);
  t.is(stats.jpeg[0].height, 400);
  // it’s a big boi
  t.true( stats.jpeg[0].size < 1000*999, `${stats.jpeg[0].size} size is too big, should be smaller than ${1000*999}.` );
});

test("Animated gif format filtering (one valid one)", async t => {
  let stats = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["jpeg", "gif"],
    sharpOptions: {
      animated: true
    },
    useCache: false,
  });

  t.deepEqual(Object.keys(stats), ["gif"]);
  t.is(stats.gif.length, 1);
  t.is(stats.gif[0].width, 400);
  t.is(stats.gif[0].height, 400);
  // it’s a big boi
  t.true( stats.gif[0].size > 1000*999 );
});

test("Change hashLength", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    hashLength: 6,
    formats: ['auto'],
    dryRun: true,
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("img/KkPMmH-1280.jpeg"));
});

test("Remote image with dryRun should have a buffer property", async t => {
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017.png", {
    dryRun: true,
    widths: ["auto"],
    formats: ["auto"],
  });

  t.truthy(stats.png[0].buffer);
});

test("Remote image with dryRun should have a buffer property, useCache: false", async t => {
  let stats = await eleventyImage("https://www.zachleat.com/img/avatar-2017.png", {
    dryRun: true,
    useCache: false,
    widths: ["auto"],
    formats: ["auto"],
  });

  t.truthy(stats.png[0].buffer);
});

test("SVG files svgShortCircuit based on file size", async t => {
  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["svg", "webp"],
    widths: [100, 1000, 1100],
    dryRun: true,
    svgShortCircuit: "size",
  });

  t.deepEqual(Object.keys(stats), ["svg", "webp"]);

  t.is(stats.svg.length, 1);

  t.is(stats.webp.length, 2);
  t.is(stats.webp.filter(entry => entry.format === "svg").length, 1);

  t.is(stats.webp[0].format, "webp");
  t.is(stats.webp[0].width, 100);
  t.truthy(stats.webp[0].size < 20000);

  t.is(stats.webp[1].format, "svg");
  t.is(stats.webp[1].width, 900);
});

test("SVG files svgShortCircuit based on file size (small SVG, exclusively SVG output)", async t => {
  let stats = await eleventyImage("./test/logo.svg", {
    formats: ["svg", "webp"],
    widths: [500],
    dryRun: true,
    svgShortCircuit: "size",
  });

  t.deepEqual(Object.keys(stats), ["svg", "webp"]);

  t.is(stats.svg.length, 1);
  t.is(stats.webp.length, 0);
});


test("SVG files svgShortCircuit based on file size (brotli compression)", async t => {
  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["svg", "webp"],
    widths: [100, 1000, 1100],
    dryRun: true,
    svgShortCircuit: "size",
    svgCompressionSize: "br",
  });

  t.deepEqual(Object.keys(stats), ["svg", "webp"]);

  t.is(stats.svg.length, 1);
  t.true(stats.svg[0].size < 30000); // original was ~68000, br compression was applied.

  t.is(stats.webp.length, 2);
  t.is(stats.webp.filter(entry => entry.format === "svg").length, 1);

  t.is(stats.webp[0].format, "webp");
  t.is(stats.webp[0].width, 100);
  t.truthy(stats.webp[0].size < 20000);

  t.is(stats.webp[1].format, "svg");
  t.is(stats.webp[1].width, 900);
});

test("#184: Ensure original size is included if any widths are larger", async t => {
  // Test image is 1280px wide; before PR for 184, asking for [1500, 900] would
  // result in only the 900px image. Now, it should result in 900px *and* 1280px
  // images.
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, 900],
    formats: ['jpeg'],
    dryRun: true,
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].width, 900);
  t.is(stats.jpeg[1].width, 1280);
});
