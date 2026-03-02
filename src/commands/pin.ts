import config from "../core/configManager.js";

export function pinCommand(gistId: string) {
  const pinned = config.get("pinnedGists");
  if (!pinned.includes(gistId)) {
    pinned.push(gistId);
    config.set("pinnedGists", pinned);
    console.log(`📌 Pinned ${gistId}`);
  } else {
    console.log("Already pinned.");
  }
}

export function unpinCommand(gistId: string) {
  const pinned = config.get("pinnedGists").filter((id) => id !== gistId);
  config.set("pinnedGists", pinned);
  console.log(`✅ Unpinned ${gistId}`);
}
