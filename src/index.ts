#!/usr/bin/env node
import { Command } from "commander";
import { openCommand } from "./commands/open.js";
import { configSetToken, configShow } from "./commands/config.js";
import { pinCommand, unpinCommand } from "./commands/pin.js";
import { cacheClearCommand } from "./commands/cache.js";

const program = new Command();

program
  .name("gistbox")
  .description("Run your GitHub Gists as CLI tools")
  .version("0.1.0");

program
  .command("open")
  .description("Open interactive gist selector")
  .action(openCommand);

program
  .command("config")
  .description("Manage configuration")
  .addCommand(
    new Command("set-token")
      .argument("<token>", "GitHub personal access token")
      .action(configSetToken),
  )
  .addCommand(new Command("show").action(configShow));

program
  .command("pin")
  .argument("<gist-id>", "Gist ID to pin")
  .action(pinCommand);

program
  .command("unpin")
  .argument("<gist-id>", "Gist ID to unpin")
  .action(unpinCommand);

program
  .command("cache")
  .command("clear")
  .description("Clear cached scripts")
  .action(cacheClearCommand);

program.parse(process.argv);
