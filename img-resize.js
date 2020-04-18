// TODO use `srcsethelp` project to improve output (blurry lowsrc?)

const path = require("path");
const fs = require("fs-extra");
const shorthash = require("short-hash");
const {default: PQueue} = require("p-queue");
const imageSize = require("image-size");
const sharp = require("sharp");
const debug = require("debug")("EleventyImgResize");

const globalOptions = {
	src: null,
	widths: [null],
	formats: ["webp", "jpeg"], //"png"
	concurrency: 10,
	urlPath: "/img/",
	outputDir: "img/"
};

const MIME_TYPES = {
	"jpeg": "image/jpg",
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

	return outputFilename = `${id}.${format}`;
}

function getStats(src, format, urlPath, width, height, includeWidthInFilename) {
	let outputFilename = getFilename(src, includeWidthInFilename ? width : false, format);
	let url = path.join(urlPath, outputFilename);

	return {
		format: format,
		width: width,
		height: height,
		// size
		// outputPath
		url: url,
		sourceType: MIME_TYPES[format],
		srcset: `${url} ${width}w`
	}
}

function sortByWidthDescending(files = []) {
	return files.sort((a, b) => {
		return b.width - a.width;
	});
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
		byType[type] = sortByWidthDescending(byType[type]);
	}
	return byType;
}

async function resizeImage(src, options = {}) {
	fs.ensureDir(options.outputDir);

	let formats = getFormatsArray(options.formats);
	let img = sharp(src, {
		failOnError: false,
		// TODO how to handle higher resolution source images
		// density: 72
	});

	let metadata = await img.metadata();
	let outputFilePromises = [];

	for(let format of formats) {
		for(let width of options.widths) {
			let hasWidth = !!width;
			// Set format
			let imageFormat = img.clone();
			if(metadata.format !== format) {
				imageFormat.toFormat(format);
			}

			// Set width
			if(hasWidth) {
				imageFormat.resize({
					width: width,
					withoutEnlargement: true
				});
			}

			let outputFilename = getFilename(src, width , format);
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

let queue = new PQueue({
	concurrency: globalOptions.concurrency
});
queue.on("active", () => {
	debug( `Concurrency: ${queue.concurrency}, Size: ${queue.size}, Pending: ${queue.pending}` );
});

async function queueResizeImage(src, opts) {
	let mergedOptions = Object.assign({}, globalOptions, opts);
	return queue.add(() => resizeImage(src, mergedOptions));
}

module.exports = queueResizeImage;

module.exports.statsSync = function(src, opts) {
	let options = Object.assign({}, globalOptions, opts);

	let results = [];
	let formats = getFormatsArray(options.formats);
	let originalDimensions = imageSize(src);

	for(let format of formats) {
		for(let width of options.widths) {
			let hasWidth = !!width;
			let height;
			if(!width) {
				width = originalDimensions.width;
				height = originalDimensions.height;
			} else {
				height = Math.floor(width * originalDimensions.height / originalDimensions.width);
			}

			results.push(getStats(src, format, options.urlPath, width, height, hasWidth));
		}
	}

	return transformRawFiles(results);
};
