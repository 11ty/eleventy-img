// TODO use `srcsethelp` project to improve output (blurry lowsrc?)

const path = require("path");
const fs = require("fs-extra");
const { URL } = require("url");

const shorthash = require("short-hash");
const {default: PQueue} = require("p-queue");
const imageSize = require("image-size");
const sharp = require("sharp");
const debug = require("debug")("EleventyImg");

const CacheAsset = require("@11ty/eleventy-cache-assets");

const globalOptions = {
	src: null,
	widths: [null],
	formats: ["webp", "jpeg"], //"png"
	concurrency: 10,
	urlPath: "/img/",
	outputDir: "img/",
	cacheDirectory: ".cache/",
	cacheDuration: "1d"
};

const MIME_TYPES = {
	"jpeg": "image/jpeg",
	"webp": "image/webp",
	"png": "image/png"
};

function getFormatsArray(formats) {
	if(formats && formats.length) {
		if(typeof formats === "string") {
			formats = formats.split(",");
		}
		return formats;
	}

	return [];
}

function getFilename(src, width, format) {
	let id = shorthash(src);

	if(width) {
		return `${id}-${width}.${format}`;
	}

	return `${id}.${format}`;
}

function getStats(src, format, urlPath, width, height, includeWidthInFilename) {
	let outputFilename = getFilename(src, includeWidthInFilename ? width : false, format);
	let url = path.join(urlPath, outputFilename);

	return {
		format: format,
		width: width,
		height: height,
		// size // only after processing
		// outputPath // only after processing
		url: url,
		sourceType: MIME_TYPES[format],
		srcset: `${url} ${width}w`
	}
}

function transformRawFiles(files = []) {
	let byType = {};
	for(let file of files) {
		if(!byType[file.format]) {
			byType[file.format] = [];
		}
		byType[file.format].push(file);
	}
	for(let type in byType) {
		// sort by width, ascending (for `srcset`)
		byType[type].sort((a, b) => {
			return a.width - b.width;
		})
	}
	return byType;
}

// src should be a file path to an image or a buffer
async function resizeImage(src, options = {}) {
	let sharpImage = sharp(src, {
		failOnError: false,
		// TODO how to handle higher resolution source images
		// density: 72
	});

	if(typeof src !== "string") {
		if(options.sourceUrl) {
			src = options.sourceUrl;
		} else {
			throw new Error(`Expected options.sourceUrl in resizeImage when using Buffer as input.`);
		}
	}

	// Must find the image format from the metadata
	// File extensions lie or may not be present in the src url!
	let metadata = await sharpImage.metadata();
	let outputFilePromises = [];

	let formats = getFormatsArray(options.formats);
	for(let format of formats) {
		let hasAtLeastOneValidMaxWidth = false;
		for(let width of options.widths) {
			let hasWidth = !!width;
			// Set format
			let imageFormat = sharpImage.clone();
			if(metadata.format !== format) {
				imageFormat.toFormat(format);
			}

			// skip this width because it’s larger than the original and we already
			// have at least one output image size that works
			if(hasAtLeastOneValidMaxWidth && (!width || width > metadata.width)) {
				continue;
			}

			// Resize the image
			if(!width) {
				hasAtLeastOneValidMaxWidth = true;
			} else {
				if(width >= metadata.width) {
					// don’t reassign width if it’s falsy
					width = null;
					hasWidth = false;
					hasAtLeastOneValidMaxWidth = true;
				} else {
					imageFormat.resize({
						width: width,
						withoutEnlargement: true
					});
				}
			}


			let outputFilename = getFilename(src, width, format);
			let outputPath = path.join(options.outputDir, outputFilename);
			outputFilePromises.push(imageFormat.toFile(outputPath).then(data => {
				let stats = getStats(src, format, options.urlPath, data.width, data.height, hasWidth);
				stats.outputPath = outputPath;
				stats.size = data.size;

				return stats;
			}));

			debug( "Writing %o", outputPath );
		}
	}

	return Promise.all(outputFilePromises).then(files => transformRawFiles(files));
}

function isFullUrl(url) {
	try {
		new URL(url);
		return true;
	} catch(e) {
		// invalid url OR local path
		return false;
	}
}

/* Combine it all together */
async function image(src, opts) {
	if(!src) {
		throw new Error("`src` is a required argument to the eleventy-img utility (can be a string file path, string URL, or buffer).");
	}

	if(typeof src === "string" && isFullUrl(src)) {
		// fetch remote image
		let buffer = await await CacheAsset(src, {
			duration: opts.cacheDuration,
			type: "buffer"
		});

		opts.sourceUrl = src;
		return resizeImage(buffer, opts);
	}

	// use file path to local image
	return resizeImage(src, opts);
}

/* Queue */
let queue = new PQueue({
	concurrency: globalOptions.concurrency
});
queue.on("active", () => {
	debug( `Concurrency: ${queue.concurrency}, Size: ${queue.size}, Pending: ${queue.pending}` );
});

async function queueImage(src, opts) {
	let options = Object.assign({}, globalOptions, opts);

	// create the output dir
	await fs.ensureDir(options.outputDir);

	return queue.add(() => image(src, options));
}

module.exports = queueImage;

Object.defineProperty(module.exports, "concurrency", {
	get: function() {
		return queue.concurrency;
	},
	set: function(concurrency) {
		queue.concurrency = concurrency;
	},
});


/* `statsSync` doesn’t generate any files, but will tell you where
 * the asynchronously generated files will end up! This is useful
 * in synchronous-only template environments where you need the
 * image URLs synchronously but can’t rely on the files being in
 * the correct location yet.
 */

function _statsSync(src, originalWidth, originalHeight, opts) {
	let options = Object.assign({}, globalOptions, opts);

	let results = [];
	let formats = getFormatsArray(options.formats);

	for(let format of formats) {
		let hasAtLeastOneValidMaxWidth = false;
		for(let width of options.widths) {
			let hasWidth = !!width;
			let height;

			if(hasAtLeastOneValidMaxWidth && (!width || width > originalWidth)) {
				continue;
			}

			if(!width) {
				width = originalWidth;
				height = originalHeight;
				hasAtLeastOneValidMaxWidth = true;
			} else {
				if(width >= originalWidth) {
					width = originalWidth;
					hasWidth = false;
					hasAtLeastOneValidMaxWidth = true;
				}
				height = Math.floor(width * originalHeight / originalWidth);
			}


			results.push(getStats(src, format, options.urlPath, width, height, hasWidth));
		}
	}

	return transformRawFiles(results);
};

function statsSync(src, opts) {
	let originalDimensions = imageSize(src);
	return _statsSync(src, originalDimensions.width, originalDimensions.height, opts);
}

function statsByDimensionsSync(src, width, height, opts) {
	return _statsSync(src, width, height, opts);
}

module.exports.statsSync = statsSync;
module.exports.statsByDimensionsSync = statsByDimensionsSync;
