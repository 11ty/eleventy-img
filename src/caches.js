import MemoryCache from "./memory-cache.js";
import DiskCache from "./disk-cache.js";
import ExistsCache from "./exists-cache.js";

let memCache = new MemoryCache();

let existsCache = new ExistsCache();

let diskCache = new DiskCache();
diskCache.setExistsCache(existsCache);

export {
  memCache,
  diskCache,
  existsCache,
};
