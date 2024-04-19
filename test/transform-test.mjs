import test from "ava";
import Eleventy from "@11ty/eleventy";
import { eleventyImageTransformPlugin } from "../img.js";

test("Using the transform plugin", async t => {
  let elev = new Eleventy( "test", "test/_site", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("virtual.html", `<img src="./bio-2017.jpg" alt="My ugly mug">`);

      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
        dryRun: true // don’t write image files!
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `<picture><source type="image/webp" srcset="/virtual/KkPMmHd3hP-1280.webp 1280w"><img src="/virtual/KkPMmHd3hP-1280.jpeg" alt="My ugly mug" width="1280" height="853"></picture>`);
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

  let results = await elev.toJSON();
  t.is(results[0].content, `<img src="/.11ty/image/?src=test%2Fbio-2017.jpg&width=1280&format=jpeg" alt="My ugly mug" width="1280" height="853">`);
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
  t.is(results[0].content, `<img loading="lazy" src="/.11ty/image/?src=test%2Fbio-2017.jpg&width=1280&format=jpeg" alt="My ugly mug" width="1280" height="853">`);
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
  t.is(results[0].content, `<img loading="lazy" src="https://example.com/" alt="My ugly mug" width="1280" height="853">`);
});

