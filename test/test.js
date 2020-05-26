const test = require("ava");
const eleventyImage = require("../");

test("Sync with jpeg input", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg");
	t.is(stats.webp.length, 1);
	t.is(stats.jpeg.length, 1);
});

test("Sync by dimension with jpeg input", t => {
	let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853);
	t.is(stats.webp.length, 1);
	t.is(stats.jpeg.length, 1);
});

test("Sync with widths", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
		widths: [300]
	});
	t.is(stats.webp.length, 1);
	t.is(stats.webp[0].width, 300);
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].width, 300);
});

test("Sync by dimension with widths", t => {
	let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
		widths: [300]
	});
	t.is(stats.webp.length, 1);
	t.is(stats.webp[0].width, 300);
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].width, 300);
});

test("Sync with two widths", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
		widths: [300, 500]
	});
	t.is(stats.webp.length, 2);
	t.is(stats.webp[0].width, 300);
	t.is(stats.webp[1].width, 500);
	t.is(stats.jpeg.length, 2);
	t.is(stats.jpeg[0].width, 300);
	t.is(stats.jpeg[1].width, 500);
});

test("Sync by dimension with two widths", t => {
	let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
		widths: [300, 500]
	});
	t.is(stats.webp.length, 2);
	t.is(stats.webp[0].width, 300);
	t.is(stats.webp[1].width, 500);
	t.is(stats.jpeg.length, 2);
	t.is(stats.jpeg[0].width, 300);
	t.is(stats.jpeg[1].width, 500);
});


test("Sync with null width", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
		widths: [300, null]
	});
	t.is(stats.webp.length, 2);
	t.is(stats.webp[0].width, 300);
	t.is(stats.webp[0].height, 199);
	t.is(stats.webp[1].width, 1280);
	t.is(stats.webp[1].height, 853);
	t.is(stats.jpeg.length, 2);
	t.is(stats.jpeg[0].width, 300);
	t.is(stats.jpeg[0].height, 199);
	t.is(stats.jpeg[1].width, 1280);
	t.is(stats.jpeg[1].height, 853);
});

test("Sync by dimension with null width", t => {
	let stats = eleventyImage.statsByDimensionsSync("./test/bio-2017.jpg", 1280, 853, {
		widths: [300, null]
	});
	t.is(stats.webp.length, 2);
	t.is(stats.webp[0].width, 300);
	t.is(stats.webp[0].height, 199);
	t.is(stats.webp[1].width, 1280);
	t.is(stats.webp[1].height, 853);
	t.is(stats.jpeg.length, 2);
	t.is(stats.jpeg[0].width, 300);
	t.is(stats.jpeg[0].height, 199);
	t.is(stats.jpeg[1].width, 1280);
	t.is(stats.jpeg[1].height, 853);
});

test("Try to use a width larger than original", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [1500],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
	t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (two sizes)", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [1500, 2000],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
	t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (with a null in there)", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [1500, null],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
	t.is(stats.jpeg[0].width, 1280);
});

test("Just falsy width", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [null],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg");
	t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [1280],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483.jpeg"); // no width in filename
	t.is(stats.jpeg[0].width, 1280);
});

test("Try to use a width larger than original (statsSync)", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
		widths: [1500],
		formats: ["jpeg"]
	});

	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].url, "/img/97854483.jpeg");
	t.is(stats.jpeg[0].width, 1280);
});

test("Use exact same width as original (statsSync)", t => {
	let stats = eleventyImage.statsSync("./test/bio-2017.jpg", {
		widths: [1280],
		formats: ["jpeg"]
	});

	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].url, "/img/97854483.jpeg"); // no width in filename
	t.is(stats.jpeg[0].width, 1280);
});

test("Try to add mime type jpg", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [225, 100],
		formats: ["jpg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpg.length, 2);
	t.is(stats.jpg[0].outputPath, "test/img/97854483-100.jpg");
	t.is(stats.jpg[1].outputPath, "test/img/97854483-225.jpg");
});

test("Try to crop with widths and heights options", async t => {
	let stats = await eleventyImage("./test/bio-2017.jpg", {
		widths: [225, 100],
		heights: [400, 200],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	});
	t.is(stats.jpeg.length, 2);
	t.is(stats.jpeg[0].outputPath, "test/img/97854483-100.jpeg");
	t.is(stats.jpeg[0].width, 100);
	t.is(stats.jpeg[0].height, 200);
	t.is(stats.jpeg[1].outputPath, "test/img/97854483-225.jpeg");
	t.is(stats.jpeg[1].width, 225);
	t.is(stats.jpeg[1].height, 400);
});

test("Try to crop with widths and heights are not balance scenario 1", async t => {
	let stats = await t.throwsAsync(() => eleventyImage("./test/bio-2017.jpg", {
		widths: [225, 100],
		heights: [400],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	}));
	t.is(stats.message, 'if `heights` is set. it should has same with length of width.');
});

test("Try to crop with widths and heights are not balance scenario 2", async t => {
	let stats = await t.throwsAsync(() => eleventyImage("./test/bio-2017.jpg", {
		widths: [225, 100],
		heights: [400, 20, 30],
		formats: ["jpeg"],
		outputDir: "./test/img/"
	}));
	t.is(stats.message, 'if `heights` is set. it should has same with length of width.');
});