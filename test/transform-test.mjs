import test from "ava";
import Eleventy from "@11ty/eleventy";
import { eleventyImageTransformPlugin } from "../img.js";
import { normalizeEscapedPaths } from "./util/utils.js";

test("Using the transform plugin", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<picture><source type="image/webp" srcset="/virtual/KkPMmHd3hP-1280.webp 1280w"><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853"></picture>`);
});

test("Using the transform plugin, data URI #238", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="data:image/" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true // don’t write image files!
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="data:image/" alt="My ugly mug">`);
});

test("Using the transform plugin (override options)", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853">`);
});

test("Using the transform plugin with transform on request during dev mode", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        transformOnRequest: true,
        dryRun: true, // don’t write image files!

        defaultAttributes: {}
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="/.11ty/image/?src=test%2Fbio-2017.jpg&width=1280&format=jpeg&via=transform" alt="My ugly mug" width="1280" height="853">`);
});

test("Using the transform plugin with transform on request during dev mode (with default attributes)", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        transformOnRequest: true,
        dryRun: true, // don’t write image files!

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="/.11ty/image/?src=test%2Fbio-2017.jpg&width=1280&format=jpeg&via=transform" alt="My ugly mug" loading="lazy" width="1280" height="853">`);
});


test("Using the transform plugin with transform on request during dev mode but don’t override existing urlFormat", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        urlFormat: function(src) {
          return 'https://example.com/';
        },
        formats: ["auto"],
        transformOnRequest: true,
        dryRun: true, // don’t write image files!

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="https://example.com/" alt="My ugly mug" loading="lazy" width="1280" height="853">`);
});

test("Throw a good error with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        // transformOnRequest: true,
        // dryRun: true, // don’t write image files!

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let e = await t.throwsAsync(() => elev.toJSON());
  t.is(e.message, `Having trouble writing to "./test/_site/virtual/index.html" from "./test/virtual.html"`);
});

test("Transform image file with diacritics #253", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./les sous titres automatisés de youtube.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!

        defaultAttributes: {}
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853">`);
});

test("Transform image file in folder with diacritics #253", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      // Broken:  20240705.île-de-myst-en-lego
      // Working: 20240705.île-de-myst-en-lego
      eleventyConfig.addTemplate("virtual.html", `<img src="./20240705.île-de-myst-en-lego/les sous titres automatisés de youtube.jpg" alt="My ugly mug">`);
      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!
        defaultAttributes: {}
      });
    }
  });

  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853">`);
});

test("Transform image file in markdown with diacritics #253", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.md", `![My ugly mug](./automatisés.jpg)`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!
        defaultAttributes: {},
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content).trim(), `<p><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853"></p>`);
});

// Doesn’t work on Ubuntu
test.skip("Transform image file in folder with *combining* diacritics #253", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./île-de-myst-en-lego/les sous titres automatisés de youtube.jpg" alt="My ugly mug">`);
      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!
        defaultAttributes: {}
      });
    }
  });

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853">`);
});

test("Don’t throw an error when failOnError: false with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        // transformOnRequest: true,
        // dryRun: true, // don’t write image files!

        failOnError: false,

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug">`);
});

test("Don’t throw an error when failOnError: true but `eleventy:optional=keep` attribute with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug" eleventy:optional="keep">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        // transformOnRequest: true,
        // dryRun: true, // don’t write image files!

        failOnError: true,

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug">`);
});

test("Don’t throw an error when failOnError: false and `eleventy:optional=keep` attribute with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug" eleventy:optional="keep">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        // transformOnRequest: true,
        // dryRun: true, // don’t write image files!

        failOnError: false,

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug">`);
});

test("Don’t throw an error when failOnError: false and `eleventy:optional` attribute with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug" eleventy:optional>`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img alt="My ugly mug">`);
});

test("Don’t throw an error when failOnError: false and `eleventy:optional=placeholder` attribute with a bad remote image request", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="https://images.opencollective.com/sdkljflksjdflksdjf_DOES_NOT_EXIST/NOT_EXIST/avatar.png" alt="My ugly mug" eleventy:optional="placeholder">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],

        defaultAttributes: {
          loading: "lazy",
        }
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(normalizeEscapedPaths(results[0].content), `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=" alt="My ugly mug">`);
});

test("Using the transform plugin, <img src=video.mp4> #257", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="car.mp4" alt="My ugly mug" eleventy:optional="keep">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true, // don’t write image files!
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="car.mp4" alt="My ugly mug">`);
});

test("Using the transform plugin, <picture> to <picture> #214", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<picture class="outer"><source type="image/webp" srcset="./bio-2017.webp 1280w"><img src="./bio-2017.jpg" alt="My ugly mug" class="inner"></picture>`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true, // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<picture class="outer"><source type="image/webp" srcset="/virtual/KkPMmHd3hP-1280.webp 1280w"><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" class="inner" width="1280" height="853"></picture>`);
});

test("Using the transform plugin, <picture> to <img> #214", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      // Uses only the <img src> right now, see the debatable TODO in transform-plugin.js->getSourcePath
      eleventyConfig.addTemplate("virtual.html", `<picture class="outer"><source type="image/webp" srcset="./bio-2017.webp 1280w"><img src="./bio-2017.jpg" alt="My ugly mug" class="inner"></picture>`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" class="inner" width="1280" height="853">`);
});

test("Using the transform plugin, <img> to <picture> #214", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug" class="inner" eleventy:pictureattr:class="outer">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true, // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<picture class="outer"><source type="image/webp" srcset="/virtual/KkPMmHd3hP-1280.webp 1280w"><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" class="inner" width="1280" height="853"></picture>`);
});

test("Using the transform plugin, <img> to <img>, keeps slot attribute #241", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug" slot="image-1">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        formats: ["auto"],
        dryRun: true, // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" slot="image-1" width="1280" height="853">`);
});

test("Using the transform plugin, <img> to <picture>, keeps slot attribute #241", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug" slot="image-1">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true, // don’t write image files!
      });
    }
  });
  elev.disableLogger();

  let results = await elev.toJSON();
  // TODO how to add independent class to <picture>
  t.is(results[0].content, `<picture><source type="image/webp" srcset="/virtual/KkPMmHd3hP-1280.webp 1280w"><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" slot="image-1" width="1280" height="853"></picture>`);
});