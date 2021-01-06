const test = require("ava");
const eleventyImage = require("../");
const generateHTML = require("../generate-html.js");

test("Image markup (defaults)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture>
  <source type="image/webp" srcset="/img/97854483-1280.webp 1280w">
  <img src="/img/97854483-1280.jpeg" width="1280" height="853" alt="">
</picture>`);
});

test("Image markup (two widths)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [200,400]
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture>
  <source type="image/webp" srcset="/img/97854483-200.webp 200w, /img/97854483-400.webp 400w">
  <source type="image/jpeg" srcset="/img/97854483-200.jpeg 200w, /img/97854483-400.jpeg 400w">
  <img src="/img/97854483-200.jpeg" width="200" height="133" alt="">
</picture>`);
});

test("Image markup (two formats)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["avif", "webp"],
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture>
  <source type="image/avif" srcset="/img/97854483-1280.avif 1280w">
  <img src="/img/97854483-1280.webp" width="1280" height="853" alt="">
</picture>`);
});

test("Image markup (one format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: [null],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img src="/img/97854483-1280.jpeg" width="1280" height="853" alt="">`);
});

test("Image markup (throws on invalid object)", async t => {
  t.throws(() => generateHTML({}, { alt: "" }));
  t.throws(() => generateHTML({ jpeg: [] }, { alt: "" }));
  t.throws(() => generateHTML({ webp: [], avif: [] }, { alt: "" }));
  t.notThrows(() => generateHTML({ jpeg: [{}] }, { alt: "" }));
});

test("Image markup (defaults, inlined)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.is(generateHTML(results, {
    alt: ""
  }, {
    whitespaceMode: "inline"
  }), `<picture><source type="image/webp" srcset="/img/97854483-1280.webp 1280w"><img src="/img/97854483-1280.jpeg" width="1280" height="853" alt=""></picture>`);
});
