const test = require("ava");
const eleventyImage = require("../");
const generateHTML = require("../generate-html.js");
const generateObject = generateHTML.generateObject;

test("Image markup (defaults)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture><source type="image/webp" srcset="/img/97854483-1280.webp 1280w"><img alt="" src="/img/97854483-1280.jpeg" width="1280" height="853"></picture>`);
});

test("Image object (defaults)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.deepEqual(generateObject(results, {
    alt: ""
  }), {
    "picture": [
      {
        "source": {
          type: "image/webp",
          srcset: "/img/97854483-1280.webp 1280w",
        }
      },
      {
        "img": {
          alt: "",
          src: "/img/97854483-1280.jpeg",
          width: 1280,
          height: 853,
        }
      }
    ]
  });
});

test("Image markup (two widths)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [200,400]
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw",
  }), [`<picture>`,
    `<source type="image/webp" srcset="/img/97854483-200.webp 200w, /img/97854483-400.webp 400w" sizes="100vw">`,
    `<source type="image/jpeg" srcset="/img/97854483-200.jpeg 200w, /img/97854483-400.jpeg 400w" sizes="100vw">`,
    `<img alt="" src="/img/97854483-200.jpeg" width="400" height="266">`,
    `</picture>`].join(""));
});

test("Image markup (two widths, no sizes—throws an error)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [200, 400]
  });

  t.throws(() => generateHTML(results, {
    alt: "",
  }));
});

test("Image markup (two formats)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["avif", "webp"],
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture><source type="image/avif" srcset="/img/97854483-1280.avif 1280w"><img alt="" src="/img/97854483-1280.webp" width="1280" height="853"></picture>`);
});

test("Image markup (one format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: [null],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img alt="" src="/img/97854483-1280.jpeg" width="1280" height="853">`);
});

test("Image markup (one format, two widths)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: [null],
    widths: [100,200],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img alt="" src="/img/97854483-100.jpeg" width="200" height="133" srcset="/img/97854483-100.jpeg 100w, /img/97854483-200.jpeg 200w" sizes="100vw">`);
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
    whitespaceMode: "block"
  }), `<picture>
  <source type="image/webp" srcset="/img/97854483-1280.webp 1280w">
  <img alt="" src="/img/97854483-1280.jpeg" width="1280" height="853">
</picture>`);
});

test("svgShortCircuit and generateHTML: Issue #48", async t => {
  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["webp", "png", "svg"],
    svgShortCircuit: true,
    dryRun: true,
  });

  let html = eleventyImage.generateHTML(stats, {
    alt: "Tiger",
  });
  t.is(html, `<img alt="Tiger" src="/img/8b4d670b-900.svg" width="900" height="900">`);
});
