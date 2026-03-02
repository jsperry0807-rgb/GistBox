import { CacheManager } from "../core/cacheManager.js";

export async function cacheClearCommand() {
  const cache = new CacheManager();
  await cache.clear();
  console.log("🧹 Cache cleared.");
}
