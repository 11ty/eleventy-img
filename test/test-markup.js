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
  }), `<picture><source type="image/webp" srcset="/img/KkPMmHd3hP-1280.webp 1280w"><img alt="" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853"></picture>`);
});

test("Image service", async t => {
  let serviceApiDomain = "https://zachleat.com";
  let siteUrl = "https://heydonworks.com/";
  let screenshotUrl = `${serviceApiDomain}/api/screenshot/?url=${encodeURIComponent(siteUrl)}&js=false`;

  let options = {
    formats: ["jpeg"],
    widths: [600], // 260-440 in layout
    urlFormat: function({ width, format }) {
      return `${serviceApiDomain}/api/image/?url=${encodeURIComponent(screenshotUrl)}&width=${width}&format=${format}`;
    },
    remoteAssetContent: 'remote asset content'
  };

  let results = eleventyImage.statsByDimensionsSync(screenshotUrl, 1440, 900, options);

  t.is(generateHTML(results, {
    alt: "",
  }), `<img alt="" src="https://zachleat.com/api/image/?url=https%3A%2F%2Fzachleat.com%2Fapi%2Fscreenshot%2F%3Furl%3Dhttps%253A%252F%252Fheydonworks.com%252F%26js%3Dfalse&width=600&format=jpeg" width="600" height="375">`);
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
          srcset: "/img/KkPMmHd3hP-1280.webp 1280w",
        }
      },
      {
        "img": {
          alt: "",
          src: "/img/KkPMmHd3hP-1280.jpeg",
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
    `<source type="image/webp" srcset="/img/KkPMmHd3hP-200.webp 200w, /img/KkPMmHd3hP-400.webp 400w" sizes="100vw">`,
    `<source type="image/jpeg" srcset="/img/KkPMmHd3hP-200.jpeg 200w, /img/KkPMmHd3hP-400.jpeg 400w" sizes="100vw">`,
    `<img alt="" src="/img/KkPMmHd3hP-200.jpeg" width="400" height="266">`,
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
  }), `<picture><source type="image/avif" srcset="/img/KkPMmHd3hP-1280.avif 1280w"><img alt="" src="/img/KkPMmHd3hP-1280.webp" width="1280" height="853"></picture>`);
});

test("Image markup (one format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: [null],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img alt="" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853">`);
});

test("Image markup (auto format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["auto"],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img alt="" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853">`);
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
  }), `<img alt="" src="/img/KkPMmHd3hP-100.jpeg" width="200" height="133" srcset="/img/KkPMmHd3hP-100.jpeg 100w, /img/KkPMmHd3hP-200.jpeg 200w" sizes="100vw">`);
});

test("Image markup (throws on invalid object)", async t => {
  t.throws(() => generateHTML({}, { alt: "" }));
  t.throws(() => generateHTML({ jpeg: [] }, { alt: "" }));
  t.throws(() => generateHTML({ webp: [], avif: [] }, { alt: "" }));
  t.notThrows(() => generateHTML({ jpeg: [{}] }, { alt: "" }));
});

test("Image markup (throws on missing alt)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.throws(() => generateHTML(results, {}));
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
  <source type="image/webp" srcset="/img/KkPMmHd3hP-1280.webp 1280w">
  <img alt="" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853">
</picture>`);
});

test("svgShortCircuit and generateHTML: Issue #48", async t => {
  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["webp", "png", "svg"],
    svgShortCircuit: true,
    dryRun: true,
  });
  t.is(stats.svg.length, 1);
  t.is(stats.webp.length, 0);
  t.is(stats.png.length, 0);
  t.is(stats.svg[0].url, "/img/W-k0C0bkvk-900.svg");

  let html = eleventyImage.generateHTML(stats, {
    alt: "Tiger",
  });
  t.is(html, `<img alt="Tiger" src="/img/W-k0C0bkvk-900.svg" width="900" height="900">`);
});

test("Filter out empty format arrays", async t => {
  let stats = {
    svg: [],
    jpeg: [
      {
        format: 'jpeg',
        width: 164,
        height: 164,
        filename: '78c26ccd-164.jpeg',
        outputPath: '_site/v3/img/build/78c26ccd-164.jpeg',
        url: '/v3/img/build/78c26ccd-164.jpeg',
        sourceType: 'image/jpeg',
        srcset: '/v3/img/build/78c26ccd-164.jpeg 164w'
      },
      {
        format: 'jpeg',
        width: 328,
        height: 328,
        filename: '78c26ccd-328.jpeg',
        outputPath: '_site/v3/img/build/78c26ccd-328.jpeg',
        url: '/v3/img/build/78c26ccd-328.jpeg',
        sourceType: 'image/jpeg',
        srcset: '/v3/img/build/78c26ccd-328.jpeg 328w'
      }
    ]
  };

  let html = eleventyImage.generateHTML(stats, {
    alt: "Tiger",
    sizes: "100vw",
  });
  t.truthy(!!html);
});
