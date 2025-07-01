import test from "ava";
import exifr from "exifr";

import eleventyImage from "../img.js";

test("Transform Empty", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    // transform: undefined,
    dryRun: true,
  });

  let exif = await exifr.parse(stats.jpeg[0].buffer);
  t.deepEqual(exif, undefined);
});

test("Transform to keep exif", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    // Keep exif metadata
    transform: function customNameForCacheKey1(sharp) {
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

test("Transform to crop an image", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    transform: function customNameForCacheKey2(sharp) {
      sharp.resize(300, 300);
    },
    dryRun: true,
  });

  t.is(stats.jpeg[0].width, 300);
  t.is(stats.jpeg[0].height, 300);
  t.true(stats.jpeg[0].size < 50000);
});

test("Resize in a transform an image takes precedence", async t => {
  let stats = await eleventyImage("./test/exif-sample-large.jpg", {
    formats: ["auto"],
    transform: function customNameForCacheKey3(sharp) {
      sharp.resize(400);
    },
    dryRun: true,
  });

  t.is(stats.jpeg[0].width, 400);
  t.is(stats.jpeg[0].height, 300);
  t.true(stats.jpeg[0].size < 50000);
});

