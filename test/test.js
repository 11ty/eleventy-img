const path = require("path");
const test = require("ava");
const fs = require("fs");
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
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (two sizes)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, 2000],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (with a null in there)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Just falsy width", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
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
  t.is(stats.jpeg[0].outputPath, path.join("test/img/a705425c-1280.jpeg"));
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/a705425c-1280.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/a705425c-1280.jpeg"); // no width in filename
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
  t.is(stats.jpeg[0].outputPath, path.join("test/img/bio-2017-a705425c-600.jpeg"));
  t.is(stats.jpeg[0].url, "/img/bio-2017-a705425c-600.jpeg");
  t.is(stats.jpeg[0].srcset, "/img/bio-2017-a705425c-600.jpeg 600w");
  t.is(stats.jpeg[0].width, 600);
  t.is(stats.jpeg[1].outputPath, path.join("test/img/bio-2017-a705425c-1280.jpeg"));
  t.is(stats.jpeg[1].url, "/img/bio-2017-a705425c-1280.jpeg");
  t.is(stats.jpeg[1].srcset, "/img/bio-2017-a705425c-1280.jpeg 1280w");
  t.is(stats.jpeg[1].width, 1280);
});

test("Unavatar test", t => {
  let stats = eleventyImage.statsByDimensionsSync("https://unavatar.now.sh/twitter/zachleat?fallback=false", 400, 400, {
    widths: [75]
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

  t.notDeepEqual(stats, {});
  t.deepEqual(stats.svg, []);
});

test("Upscale an SVG, Issue #32", async t => {
  let stats = await eleventyImage("./test/logo.svg", {
    widths: [3000],
    formats: ["png"],
    outputDir: "./test/img/"
  });

  t.is(stats.png.length, 1);
  t.is(stats.png[0].filename.substr(-9), "-3000.png"); // should include width in filename
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
  t.not(stats.png[0].filename.substr(-9), "-3000.png"); // should not include width in filename
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

  t.is(stats.svg.length, 1);
  t.truthy(stats.svg[0].size);
  t.is(stats.png.length, 0);
  t.is(stats.webp.length, 0);
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
  t.is(stats.jpeg[0].outputPath, path.join("img/a705425c-164.jpeg"));
});

test("Sync by dimension with jpeg input (wrong dimensions, supplied are larger than real)", t => {
  let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1500, 1500, {
    widths: [164, 328],
    formats: ["jpeg"],
  });

  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].outputPath, path.join("img/a705425c-164.jpeg"));
  t.is(stats.jpeg[1].outputPath, path.join("img/a705425c-328.jpeg"));
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
    outputDir: "./test/img/"
  });

  fs.copyFileSync("./test/modify-bio-grayscale.jpg", "./test/generated-modify-bio.jpg");

  let promise2 = eleventyImage("./test/generated-modify-bio.jpg", {
    outputDir: "./test/img/"
  });

  t.not(promise1, promise2);
});

// failing on github actions on windows
test.skip("Keep a cache, don’t reuse with if the image changes, check output", async t => {
  fs.copyFileSync("./test/modify2-bio-original.jpg", "./test/generated-modify2-bio.jpg");

  let stats1 = await eleventyImage("./test/generated-modify2-bio.jpg", {
    outputDir: "./test/img/"
  });

  fs.copyFileSync("./test/modify2-bio-grayscale.jpg", "./test/generated-modify2-bio.jpg");

  let stats2 = await eleventyImage("./test/generated-modify2-bio.jpg", {
    outputDir: "./test/img/"
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
        filename: 'a705425c-1280.jpeg',
        format: 'jpeg',
        height: 853,
        outputPath: path.join('img/a705425c-1280.jpeg'),
        size: 276231,
        sourceType: "image/jpeg",
        srcset: '/img/a705425c-1280.jpeg 1280w',
        url: '/img/a705425c-1280.jpeg',
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
