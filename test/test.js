const test = require("ava");
const eleventyImageResize = require("../");

test("Sync with jpeg input", t => {
	let stats = eleventyImageResize.statsSync("./test/bio-2017.jpg");
	t.is(stats.webp.length, 1);
	t.is(stats.jpeg.length, 1);
});

test("Sync with widths", t => {
	let stats = eleventyImageResize.statsSync("./test/bio-2017.jpg", {
		widths: [300]
	});
	t.is(stats.webp.length, 1);
	t.is(stats.webp[0].width, 300);
	t.is(stats.jpeg.length, 1);
	t.is(stats.jpeg[0].width, 300);
});

test("Sync with two widths", t => {
	let stats = eleventyImageResize.statsSync("./test/bio-2017.jpg", {
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
	let stats = eleventyImageResize.statsSync("./test/bio-2017.jpg", {
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