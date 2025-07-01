import eleventyImage from "../img.js";

let results = await eleventyImage("../test/bio-2017.jpg", {
  formats: [null],
  widths: [null],
  sharpJpegOptions: {
    quality: 99
  },
});

console.log( results );
