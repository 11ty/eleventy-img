const fs = require("fs-extra");
const fetch = require("node-fetch");
const path = require("path");
const flatCache = require("flat-cache");
const shorthash = require("short-hash");

class FetchImage {
	getDurationMs(duration = "0s") {
		let durationUnits = duration.substr(-1);
		let durationMultiplier;
		if(durationUnits === "s") {
			durationMultiplier = 1;
		} else if(durationUnits === "m") {
			durationMultiplier = 60;
		} else if(durationUnits === "h") {
			durationMultiplier = 60 * 60;
		} else if(durationUnits === "d") {
			durationMultiplier = 60 * 60 * 24;
		} else if(durationUnits === "w") {
			durationMultiplier = 60 * 60 * 24 * 7;
		} else if(durationUnits === "y") {
			durationMultiplier = 60 * 60 * 24 * 365;
		}

		let durationValue = parseInt(duration.substr(0, duration.length - 1), 10);
		return durationValue * durationMultiplier * 1000;
	}

	isValidCache(cacheObj, url, duration) {
		return cacheObj && (duration === "*" || (Date.now() - cacheObj.cachedAt < this.getDurationMs(duration)));
	}

	addToCache(cache, url, buffer) {
		cache.setKey(url, {
			cachedAt: Date.now(),
			buffer: buffer
		});
		cache.save();
	}

	getCache(url, cacheDirectory) {
		let id = shorthash(url);
		return flatCache.load(`eleventy-img-${id}`, path.resolve(cacheDirectory));
	}

	async fetchBufferFromUrl(url, options) {
		let { cacheDirectory, cacheDuration } = options;

		let cache;
		if(cacheDirectory) {
			cache = this.getCache(url, cacheDirectory);
			let cacheObj = cache.getKey(url);
			if(this.isValidCache(cacheObj, url, cacheDuration)) {
				return Buffer.from(cacheObj.buffer);
			}
		}

		console.log( `eleventy-img fetching ${url}` );
		let response = await fetch(url);
		if(!response.ok) {
			throw new Error(`Bad response for ${url} (${res.status}): ${res.statusText}`)
		}
		let body = await response.buffer();
		if(cacheDirectory) {
			this.addToCache(cache, url, body.toJSON());
		}
		return body;
	}
}

module.exports = FetchImage;