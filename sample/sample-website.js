const eleventyImage = require("../");

(async () => {
  let metadata = await eleventyImage("./test/Flag_of_Mexico.svg", {
    formats: ["svg", "avif"],
    widths: [600, null],
    dryRun: true,
  });

  let attrs = {
    alt: "Flag of Mexico",
    sizes: "100vw",
  };

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="">
      <title></title>
    </head>
    <body>
      <header>
        <h1>eleventy-img</h1>
      </header>
      <main>
        ${await eleventyImage.generateHTML(metadata, attrs)}
      </main>
    </body>
  </html>`;

  console.log( html );
})();

