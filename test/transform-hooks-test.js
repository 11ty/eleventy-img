const test = require("ava");
const exifr = require("exifr");

const eleventyImage = require("../img.js");

test("Transforms Empty", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    // transform: undefined,
    dryRun: true,
  });

  let exif = await exifr.parse(stats.jpeg[0].buffer);
  t.deepEqual(exif, undefined);
});

test("Transforms keep exif", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    // Keep exif metadata
    transform: (sharp) => {
      sharp.keepExif();
    },
    dryRun: true,
  });

  let exif = await exifr.parse(stats.jpeg[0].buffer);

  t.is(Math.round(exif.latitude), 50);
  t.is(Math.round(exif.longitude), 15);
  t.is(exif.ApertureValue, 2);
  t.is(exif.BrightnessValue, 9.38);
});
