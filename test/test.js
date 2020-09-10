const path = require("path");
const test = require("ava");
const eleventyImage = require("../");

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

test("Try to use a width larger than original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (two sizes)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, 2000],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (with a null in there)", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1500, null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Just falsy width", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [null],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["jpeg"],
    outputDir: "./test/img/"
  });
  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg"); // no width in filename
  t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1500],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/97854483.jpeg");
  t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original (statsSync)", t => {
  let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
    widths: [1280],
    formats: ["jpeg"]
  });

  t.is(stats.jpeg.length, 1);
  t.is(stats.jpeg[0].url, "/img/97854483.jpeg"); // no width in filename
  t.is(stats.jpeg[0].width, 1280);
});

test("Use custom function to define file names", async (t) => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: [600, 1280],
    formats: ["jpeg"],
    outputDir: "./test/img/",
    filenameFormat: function (id, src, width, format, options) {
      const ext = path.extname(src)
      const name = path.basename(src, ext)

      if (width) {
        return `${name}-${id}-${width}.${format}`;
      }

      return `${name}-${id}.${format}`;
    }
  });
  t.is(stats.jpeg.length, 2);
  t.is(stats.jpeg[0].outputPath, "test/img/bio-2017-97854483-600.jpeg");
  t.is(stats.jpeg[0].url, "/img/bio-2017-97854483-600.jpeg")
  t.is(stats.jpeg[0].srcset, "/img/bio-2017-97854483-600.jpeg 600w");
  t.is(stats.jpeg[0].width, 600);
  t.is(stats.jpeg[1].outputPath, "test/img/bio-2017-97854483.jpeg");
  t.is(stats.jpeg[1].url, "/img/bio-2017-97854483.jpeg");
  t.is(stats.jpeg[1].srcset, "/img/bio-2017-97854483.jpeg 1280w");
  t.is(stats.jpeg[1].width, 1280);
})

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
