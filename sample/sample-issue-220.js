const eleventyImage = require("../img");

(async () => {
  let results = await eleventyImage("https://images.ctfassets.net/qbmf238cr6te/2ExPY7uYyafazH0IfFnpTD/610bce5faa1598685f2985d2062dcf1f/heyflow-logo.svg", {
    formats: [null],
    widths: [null],
    sharpOptions: {
      unlimited: true
    }
  });

  console.log( results );
})();
