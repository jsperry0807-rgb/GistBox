import config from "../core/configManager.js";

export function configSetToken(token: string) {
  config.set("githubToken", token);
  console.log("✅ GitHub token saved.");
}

export function configShow() {
  console.log("GitHub token:", config.get("githubToken") ? "****" : "not set");
  console.log("Pinned gists:", config.get("pinnedGists"));
  console.log("Cache TTL:", config.get("cacheTTL"), "ms");
}
