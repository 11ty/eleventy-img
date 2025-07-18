import test from "ava";
import eleventyImage from "../img.js";
import { generateHTML, generateObject } from "../src/generate-html.js";

test("Image markup (defaults)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture><source type="image/webp" srcset="/img/KkPMmHd3hP-1280.webp 1280w"><img src="/img/KkPMmHd3hP-1280.jpeg" alt="" width="1280" height="853"></picture>`);
});

test("Image file with diacritics #253", async t => {
  let results = await eleventyImage("./test/les sous titres automatisés de youtube.jpg", {
    dryRun: true
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture><source type="image/webp" srcset="/img/KkPMmHd3hP-1280.webp 1280w"><img src="/img/KkPMmHd3hP-1280.jpeg" alt="" width="1280" height="853"></picture>`);
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
    "picture": {
      "@children": [
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
    }
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
    `<img src="/img/KkPMmHd3hP-200.jpeg" alt="" width="400" height="266" srcset="/img/KkPMmHd3hP-200.jpeg 200w, /img/KkPMmHd3hP-400.jpeg 400w" sizes="100vw">`,
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
  }), `<picture><source type="image/avif" srcset="/img/KkPMmHd3hP-1280.avif 1280w"><img src="/img/KkPMmHd3hP-1280.webp" alt="" width="1280" height="853"></picture>`);
});

test("Image markup (one format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: [null],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img src="/img/KkPMmHd3hP-1280.jpeg" alt="" width="1280" height="853">`);
});

test("Image markup (auto format)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["auto"],
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img src="/img/KkPMmHd3hP-1280.jpeg" alt="" width="1280" height="853">`);
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
  }), `<img src="/img/KkPMmHd3hP-100.jpeg" alt="" width="200" height="133" srcset="/img/KkPMmHd3hP-100.jpeg 100w, /img/KkPMmHd3hP-200.jpeg 200w" sizes="100vw">`);
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

  t.throws(() => generateHTML(results, {
    src: "./test/bio-2017.jpg"
  }), {
    message: "Missing `alt` attribute on eleventy-img shortcode from: ./test/bio-2017.jpg"
  });
});

test("Image markup (throws on missing alt return html)", async t => {
  await t.throwsAsync(() => eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    returnType: "html"
  }), {
    message: "Missing `alt` attribute on eleventy-img shortcode from: ./test/bio-2017.jpg"
  });
});

test("Image markup (throws on missing sizes return html)", async t => {
  await t.throwsAsync(() => eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [100,200],
    returnType: "html",
    htmlOptions: {
      imgAttributes: {
        alt: "",
      }
    }
  }), {
    message: 'Missing `sizes` attribute on eleventy-img shortcode from: ./test/bio-2017.jpg. Workarounds: 1. Use a single output width for this image 2. Use `loading="lazy"` (which uses sizes="auto" though browser support currently varies)'
  });
});

test("#207 Uses sizes=auto as fallback when loading=lazy to avoid error message", async t => {
  let html = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [100,200],
    returnType: "html",
    htmlOptions: {
      imgAttributes: {
        alt: "",
        loading: "lazy"
      }
    }
  });

  t.is(html, '<picture><source type="image/webp" srcset="/img/KkPMmHd3hP-100.webp 100w, /img/KkPMmHd3hP-200.webp 200w" sizes="auto"><img alt="" loading="lazy" src="/img/KkPMmHd3hP-100.jpeg" width="200" height="133" srcset="/img/KkPMmHd3hP-100.jpeg 100w, /img/KkPMmHd3hP-200.jpeg 200w" sizes="auto"></picture>');
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
  <img src="/img/KkPMmHd3hP-1280.jpeg" alt="" width="1280" height="853">
</picture>`);
});

test("svgShortCircuit and generateHTML: Issue #48", async t => {
  // let img = new eleventyImage.Image("./test/Ghostscript_Tiger.svg", {
  //   formats: ["webp", "png", "svg"],
  //   svgShortCircuit: true,
  //   dryRun: true,
  // });
  // let svgStats = eleventyImage.ImageStat.getStat("./test/Ghostscript_Tiger.svg", "svg", "/img/", 900, 900, img.options);
  // console.log( svgStats );

  let stats = await eleventyImage("./test/Ghostscript_Tiger.svg", {
    formats: ["webp", "png", "svg"],
    svgShortCircuit: true,
    dryRun: true,
  });
  t.is(stats.svg.length, 1);
  t.is(stats.webp, undefined);
  t.is(stats.png, undefined);
  t.is(stats.svg[0].url, "/img/wGeeKEWkof-900.svg");

  let html = eleventyImage.generateHTML(stats, {
    alt: "Tiger",
  });
  t.is(html, `<img src="/img/wGeeKEWkof-900.svg" alt="Tiger" width="900" height="900">`);
});

test("svgShortCircuit (on a raster source) #242 generateHTML function", async t => {
  let stats = await eleventyImage("./test/bio-2017.jpg", {
    widths: ["auto"],
    formats: ["svg", "png"],
    svgShortCircuit: true,
    useCache: false,
    dryRun: true,
  });

  let html = eleventyImage.generateHTML(stats, {
    alt: "Zach’s ugly mug",
  });
  t.is(html, `<img src="/img/KkPMmHd3hP-1280.png" alt="Zach’s ugly mug" width="1280" height="853">`);
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

test("Image markup (animated gif)", async t => {
  let results = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["auto"]
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<img src="/img/YQVTYq1wRQ-400.gif" alt="" width="400" height="400">`);
});

test("Image markup (animated gif, two formats)", async t => {
  let results = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["webp", "auto"]
  });

  t.is(generateHTML(results, {
    alt: ""
  }), `<picture><source type="image/webp" srcset="/img/YQVTYq1wRQ-400.webp 400w"><img src="/img/YQVTYq1wRQ-400.gif" alt="" width="400" height="400"></picture>`);
});

test("Image markup (two formats, neither priority defined)", async t => {
  let results = await eleventyImage("./test/earth-animated.gif", {
    dryRun: true,
    formats: ["tif", "heic"]
  });

  let e = t.throws(() => generateHTML(results, { alt: "" }));
  t.true(e.message.startsWith("Could not find the lowest <img>"));
});

test("Image markup (escaped `alt`)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    formats: ["auto"],
    dryRun: true,
  });

  t.is(generateHTML(results, {
    alt: "This is a \"test"
  }), `<img src="/img/KkPMmHd3hP-1280.jpeg" alt="This is a &quot;test" width="1280" height="853">`);
});

test("Image markup (<picture> with attributes issue #197)", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    formats: ["webp", "auto"],
    dryRun: true,
    widths: [200,400]
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw",
  }, {
    pictureAttributes: {
      class: "pic"
    }
  }), [`<picture class="pic">`,
    `<source type="image/webp" srcset="/img/KkPMmHd3hP-200.webp 200w, /img/KkPMmHd3hP-400.webp 400w" sizes="100vw">`,
    `<img src="/img/KkPMmHd3hP-200.jpeg" alt="" width="400" height="266" srcset="/img/KkPMmHd3hP-200.jpeg 200w, /img/KkPMmHd3hP-400.jpeg 400w" sizes="100vw">`,
    `</picture>`].join(""));
});

test("Issue #177", t => {
  let src = "https://www.zachleat.com/img/avatar-2017.png?q=1";

  const options = {
    widths: [700, 1200, 2000],
    formats: ['avif', 'jpeg'],
    outputDir: './_site/img/',
    urlPath: '/img/',
    cacheOptions: {
      duration: '1d',
    },
  };

  let metadata = eleventyImage.statsByDimensionsSync(src, 160, 160, options);

  const imageAttributes = {
    alt: "",
    sizes: '(max-width: 0px) 100vw',
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'high',
    class: 'w-full h-full object-cover',
  };

  t.is(eleventyImage.generateHTML(metadata, imageAttributes), `<picture><source type="image/avif" srcset="/img/8u6v7oPGyC-160.avif 160w" sizes="(max-width: 0px) 100vw"><img alt="" loading="lazy" decoding="async" fetchPriority="high" class="w-full h-full object-cover" src="/img/8u6v7oPGyC-160.jpeg" width="160" height="160"></picture>`);
});

test("Image markup with smallest fallback dimensions", async t => {
  let results = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    widths: [300, "auto"],
    formats: ["auto"],
    htmlOptions: {
      fallback: "smallest",
    },
  });

  t.is(generateHTML(results, {
    alt: "",
    sizes: "100vw"
  }), `<img src="/img/KkPMmHd3hP-300.jpeg" alt="" width="300" height="199" srcset="/img/KkPMmHd3hP-300.jpeg 300w, /img/KkPMmHd3hP-1280.jpeg 1280w" sizes="100vw">`);
});

test("returnType: html to <img>", async t => {
  let html = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["auto"],
    returnType: "html",

    // passed to generateHTML
    htmlOptions: {
      imgAttributes: {
        alt: "",
      },
    },
  });

  t.is(html, `<img alt="" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853">`);
});

test("returnType: html to <picture>", async t => {
  let html = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    returnType: "html",

    // passed to generateHTML
    htmlOptions: {
      imgAttributes: {
        alt: "",
        class: "inner",
      },
      pictureAttributes: {
        class: "outer"
      }
    },
  });

  t.is(html, `<picture class="outer"><source type="image/webp" srcset="/img/KkPMmHd3hP-1280.webp 1280w"><img alt="" class="inner" src="/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853"></picture>`);
});

test("#239 full urls in urlPath", async t => {
  let html = await eleventyImage("./test/bio-2017.jpg", {
    dryRun: true,
    formats: ["auto"],
    returnType: "html",
    urlPath: "http://example.com/img/",

    htmlOptions: {
      imgAttributes: {
        alt: "",
      },
    },
  });

  t.is(html, `<img alt="" src="http://example.com/img/KkPMmHd3hP-1280.jpeg" width="1280" height="853">`);
});
