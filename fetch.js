const fetch = require("node-fetch");

class FetchImage {
	async fetchBufferFromUrl(url) {
		let response = await fetch(url);
		if(!response.ok) {
			throw new Error(`Bad response for ${url} (${res.status}): ${res.statusText}`)
		}
		let body = response.buffer();
		return body;
	}
}

module.exports = FetchImage;