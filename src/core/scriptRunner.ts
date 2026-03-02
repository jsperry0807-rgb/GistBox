import { execa } from "execa";
import path from "path";
import fs from "fs-extra";
import { DependencyManager } from "./dependencyManager.js";

export async function runScript(filePath: string, args: string[] = []) {
  const ext = path.extname(filePath);
  let command: string;
  let scriptArgs: string[];

  // Determine interpreter
  switch (ext) {
    case ".js":
    case ".mjs":
    case ".cjs":
      command = "node";
      scriptArgs = []; // we'll set the script path later
      break;
    case ".ts":
      command = "ts-node";
      scriptArgs = [filePath, ...args];
      break;
    case ".sh":
      command = "bash";
      scriptArgs = [filePath, ...args];
      break;
    case ".py":
      command = "python3";
      scriptArgs = [filePath, ...args];
      break;
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  // For Node.js scripts, use a sandbox with proper module type and dependencies
  if (command === "node") {
    const depManager = new DependencyManager();
    const scriptContent = await fs.readFile(filePath, "utf-8");
    const deps = depManager.parseDependencies(scriptContent);

    // Ask for confirmation if there are dependencies
    let shouldInstall = true;
    if (deps.length > 0) {
      shouldInstall = await depManager.confirmInstall(deps);
    }

    if (shouldInstall) {
      const { scriptPath, nodeModulesPath, cleanup } =
        await depManager.createSandbox(filePath, deps);
      const env = { ...process.env, NODE_PATH: nodeModulesPath };
      try {
        await execa("node", [scriptPath, ...args], { stdio: "inherit", env });
      } finally {
        // Optionally keep the sandbox for future runs (or clean up later)
        // await cleanup();
      }
      return;
    } else {
      // Run without dependencies (may fail if deps missing)
      await execa("node", [filePath, ...args], { stdio: "inherit" });
    }
  } else {
    // Non-Node.js scripts run directly
    try {
      await execa(command, scriptArgs, { stdio: "inherit" });
    } catch (error: any) {
      console.error(`\n❌ Script exited with code ${error.exitCode}`);
    }
  }
}
